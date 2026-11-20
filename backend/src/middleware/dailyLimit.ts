import type { RequestHandler } from "express";
import { sendError } from "../lib/errors";
import { endOfUtcDay, releaseUsage, takeUsage, utcDay } from "../lib/usageCounter";
import { currentUser } from "./auth";

/** Counter key for one user on one UTC day, e.g. "ats:<uid>:2026-11-19". */
export const dailyUsageKey = (name: string, uid: string, now: number = Date.now()) =>
  `${name}:${uid}:${utcDay(now)}`;

export const FEATURE_OFF_MESSAGE = "This feature is turned off right now.";

export type DailyLimitOptions = {
  /** Counter name, used in the key. */
  name: string;
  /** Read on every request, so config changes apply. */
  limit: () => number;
  /** Error code sent with the 429. */
  code: string;
  /** Plain message sent with the 429. */
  message: (limit: number) => string;
};

/**
 * Per user per UTC day (keyed by Firebase uid, so it runs after
 * authenticateUser). Stored in MongoDB, so a restart does not reset it.
 * A use is reserved before the handler runs (atomic, so parallel requests
 * cannot pass the limit) and given back when the response is a 4xx/5xx. A
 * client that leaves early is still counted: the AI call has already started
 * and costs money.
 */
export function dailyUsageLimit({ name, limit, code, message }: DailyLimitOptions): RequestHandler {
  return async (req, res, next) => {
    const now = Date.now();
    const key = dailyUsageKey(name, currentUser(req).uid, now);
    const max = limit();

    // A limit of 0 means the feature is switched off, not that the user used it up.
    if (max <= 0) {
      sendError(req, res, 429, FEATURE_OFF_MESSAGE, code);
      return;
    }

    if (!(await takeUsage(key, max, endOfUtcDay(now)))) {
      sendError(req, res, 429, message(max), code);
      return;
    }

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      // Only a failed request is given back. "close" without "finish" means the
      // client left; the AI call still ran, so it stays counted.
      if (res.writableFinished && res.statusCode >= 400) {
        releaseUsage(key).catch((error: unknown) => {
          req.log.warn({ err: error, counter: name }, "Could not give back a daily use");
        });
      }
    };
    res.once("finish", settle);
    res.once("close", settle);

    next();
  };
}
