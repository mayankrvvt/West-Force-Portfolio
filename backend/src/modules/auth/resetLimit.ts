import { createHash } from "node:crypto";
import { logger } from "../../lib/logger";

/** At most this many reset emails per address per window. */
export const RESET_EMAILS_PER_ADDRESS = 3;
const WINDOW_MS = 60 * 60 * 1000;
/** Hard cap on tracked addresses, so a flood of new addresses cannot use up memory. */
const MAX_TRACKED = 100_000;

// sha256 of the address -> sends in the current window. In memory, so it only
// holds for one server instance (the app runs as one).
const windows = new Map<string, { count: number; resetAt: number }>();

const keyFor = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

function dropExpired(now: number): void {
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key);
  }
}

/**
 * Per address limit on reset emails, on top of the per IP limit (which a
 * faked X-Forwarded-For can get round). Returns true and counts the send when
 * this address is still under RESET_EMAILS_PER_ADDRESS this hour. Only a hash
 * of the address is kept, never the address itself.
 */
export function takeResetEmailSlot(email: string, now = Date.now()): boolean {
  const key = keyFor(email);
  let entry = windows.get(key);

  if (!entry || entry.resetAt <= now) {
    if (windows.size >= MAX_TRACKED) dropExpired(now);
    if (windows.size >= MAX_TRACKED) {
      // Fail closed: under a flood this big, send nothing new until slots free up.
      logger.warn("Password reset per address limit is full; reset email skipped");
      return false;
    }
    entry = { count: 0, resetAt: now + WINDOW_MS };
    windows.set(key, entry);
  }

  if (entry.count >= RESET_EMAILS_PER_ADDRESS) return false;
  entry.count += 1;
  return true;
}
