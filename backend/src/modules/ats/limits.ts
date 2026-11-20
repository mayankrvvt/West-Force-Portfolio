import type { RequestHandler } from "express";
import { sendError } from "../../lib/errors";
import { endOfUtcDay, releaseUsage, takeUsage, utcDay } from "../../lib/usageCounter";
import { currentUser } from "../../middleware/auth";

export const ATS_DAILY_LIMIT = 20;

/** Counter key for one user on one UTC day. */
export const atsUsageKey = (uid: string, now: number = Date.now()) => `ats:${uid}:${utcDay(now)}`;

/**
 * 20 ATS checks per user per UTC day (keyed by Firebase uid, so it runs after
 * authenticateUser). Stored in MongoDB, so a restart does not reset it.
 * A check is reserved before it runs (atomic, so parallel requests cannot pass
 * the limit) and given back when the response is a 4xx/5xx. A client that
 * leaves early is still counted: the AI call has already started and costs money.
 */
export const atsDailyLimit: RequestHandler = async (req, res, next) => {
  const now = Date.now();
  const key = atsUsageKey(currentUser(req).uid, now);

  if (!(await takeUsage(key, ATS_DAILY_LIMIT, endOfUtcDay(now)))) {
    sendError(
      req,
      res,
      429,
      `You have used all ${ATS_DAILY_LIMIT} ATS checks for today. Please try again tomorrow.`,
      "ATS_DAILY_LIMIT"
    );
    return;
  }

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    // Only a failed check is given back. "close" without "finish" means the
    // client left; the AI call still ran, so it stays counted.
    if (res.writableFinished && res.statusCode >= 400) {
      releaseUsage(key).catch((error: unknown) => {
        req.log.warn({ err: error }, "Could not give back an ATS check");
      });
    }
  };
  res.once("finish", settle);
  res.once("close", settle);

  next();
};
