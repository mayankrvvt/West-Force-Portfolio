import type { NextFunction, Request, Response } from "express";
import { config, isProduction } from "../../lib/config";
import { parse } from "../../lib/validate";
import { authenticateUser } from "../../middleware/auth";
import { requirePaidUser } from "../../middleware/requirePaid";
import { type AnonSlot, chatLimits } from "./limits";
import { chatBody } from "./schema";
import { buildContents, generateReply, geminiErrorMessage } from "./service";

const UNAVAILABLE = "The AI assistant is temporarily unavailable. Please try again.";

/** Debug details go to the client only outside production. */
const debug = (value: unknown) => (isProduction ? undefined : value);

/**
 * Guests may chat (with daily caps). A request that sends a token must have a
 * valid one and a paid plan. Both middlewares answer 401/402 themselves and
 * only call the callback on success, so a bad token never gets through.
 */
export function resolveAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers.authorization) {
    next();
    return;
  }

  authenticateUser(req, res, () => {
    requirePaidUser(req, res, next).catch(next);
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

  let anonSlot: AnonSlot | null = null;
  if (!req.user) {
    const taken = await chatLimits.takeAnonSlot(ip);

    if (taken.blocked) {
      res.status(429).json({
        success: false,
        message:
          taken.blocked === "global"
            ? "The AI assistant has reached its daily limit for guests. Please sign in or try again tomorrow."
            : "You have reached today's guest limit for the AI assistant. Please sign in or try again tomorrow.",
      });
      return;
    }

    anonSlot = taken.slot;
  }

  // The guest slot is refunded unless Gemini answers.
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
    if (anonSlot && !succeeded) {
      await chatLimits.refundAnonSlot(anonSlot).catch((error: unknown) => {
        log.warn({ err: error }, "Could not give back a guest chat slot");
      });
    }
  }
}
