import type { NextFunction, Request, Response } from "express";
import { config, isProduction } from "../../lib/config";
import { sendError } from "../../lib/errors";
import { parse } from "../../lib/validate";
import { authenticateUser, currentUser } from "../../middleware/auth";
import { findUserEntitlement } from "../payments/service";
import { chatLimits } from "./limits";
import { chatBody } from "./schema";
import { buildContents, generateReply, geminiErrorMessage } from "./service";

const UNAVAILABLE = "The AI assistant is temporarily unavailable. Please try again.";

/** Debug details go to the client only outside production. */
const debug = (value: unknown) => (isProduction ? undefined : value);

const LIMIT_FREE = {
  code: "CHAT_LIMIT_FREE",
  message: "You've used today's free messages. Please buy a plan to keep chatting.",
};
const LIMIT_PAID = {
  code: "CHAT_LIMIT_PAID",
  message: "You've reached today's limit. It resets tomorrow.",
};

/**
 * Guests may chat (with daily caps). A request that sends a token must have a
 * valid one: authenticateUser answers 401 itself and only calls the callback
 * on success, so a bad token never gets through. Signed-in users with a plan
 * get req.entitlement (the paid tier); others chat on the free tier.
 */
export function resolveAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers.authorization) {
    next();
    return;
  }

  authenticateUser(req, res, () => {
    findUserEntitlement(currentUser(req))
      .then((entitlement) => {
        if (entitlement) req.entitlement = entitlement;
        next();
      })
      .catch(next);
  }).catch(next);
}

/** POST /api/chat */
export async function postChat(req: Request, res: Response): Promise<void> {
  const log = req.log;
  // req.ip is the real client IP ("trust proxy" is set in app.ts).
  const ip = req.ip || "unknown";

  const rate = await chatLimits.hitRateLimit(ip);
  if (!rate.allowed) {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a moment and try again.",
      retryAfter: rate.retryAfter,
    });
    return;
  }

  const apiKey = config.GEMINI_API_KEY;
  if (!apiKey) {
    log.error("GEMINI_API_KEY is missing.");
    res.status(500).json({ success: false, message: "Gemini API is not configured on the server." });
    return;
  }

  // Invalid messages throw 400 here, before a daily slot is taken.
  const { message, history } = parse(chatBody, req.body);
  const contents = buildContents(message, history);

  // Take one daily slot; `refund` gives it back if Gemini does not answer.
  let refund: () => Promise<void>;
  if (req.user) {
    const tier = req.entitlement ? "paid" : "free";
    const taken = await chatLimits.takeUserSlot(req.user.uid, tier);

    if (taken.blocked) {
      const limit = tier === "paid" ? LIMIT_PAID : LIMIT_FREE;
      sendError(req, res, 429, limit.message, limit.code);
      return;
    }

    const slot = taken.slot;
    refund = () => chatLimits.refundUserSlot(slot);
  } else {
    const taken = await chatLimits.takeAnonSlot(ip);

    if (taken.blocked === "global") {
      res.status(429).json({
        success: false,
        message:
          "The AI assistant has reached its daily limit for guests. Please sign in or try again tomorrow.",
      });
      return;
    }

    if (taken.blocked) {
      sendError(req, res, 429, LIMIT_FREE.message, LIMIT_FREE.code);
      return;
    }

    const slot = taken.slot;
    refund = () => chatLimits.refundAnonSlot(slot);
  }

  let succeeded = false;

  try {
    const reply = await generateReply(contents, apiKey);

    if (!reply.ok && reply.reason === "http") {
      log.error({ status: reply.status, response: reply.data }, "Gemini API error");
      res.status(502).json({
        success: false,
        message: geminiErrorMessage(reply.status),
        debug: debug(reply.data),
      });
      return;
    }

    if (!reply.ok) {
      log.error({ response: reply.data }, "Gemini returned no generated text");
      res.status(502).json({
        success: false,
        message: "Gemini did not return a response. Please try again.",
      });
      return;
    }

    succeeded = true;
    res.status(200).json({ success: true, message: reply.text, model: config.GEMINI_CHAT_MODEL });
  } catch (error) {
    if ((error as { name?: unknown } | null)?.name === "TimeoutError") {
      log.error("Gemini request timed out");
      res.status(504).json({
        success: false,
        message: "The AI assistant took too long to respond. Please try again.",
      });
      return;
    }

    log.error({ err: error }, "WestForce AI server error");
    res.status(500).json({
      success: false,
      message: UNAVAILABLE,
      debug: debug(error instanceof Error ? error.message : undefined),
    });
  } finally {
    if (!succeeded) {
      await refund().catch((error: unknown) => {
        log.warn({ err: error }, "Could not give back a chat slot");
      });
    }
  }
}
