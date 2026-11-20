import { setTimeout as sleep } from "node:timers/promises";
import { AppError, isTimeoutError } from "./errors";
import { logger } from "./logger";

/** Wait before the one retry. Short, because a person is waiting on the request. */
export const AI_RETRY_DELAY_MS = 500;

// Socket and DNS errors that usually pass on a second try. Header and body
// timeouts are left out: like our own timeout, the person already waited.
const NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

/** 429 and 5xx are worth one more try. Other 4xx (bad request, key, permission) never are. */
export function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function isNetworkError(error: unknown): boolean {
  const err = error as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = err?.code ?? err?.cause?.code;

  if (typeof code === "string" && NETWORK_CODES.has(code)) return true;

  // fetch (undici) reports every network failure as TypeError("fetch failed").
  return error instanceof TypeError && error.message === "fetch failed";
}

/**
 * True for a failed AI call that may pass on a second try: a 429 or 5xx from
 * the API (the Gemini SDK's ApiError carries `status`) or a network error.
 * A timeout is never retried: the call already waited the full time (up to
 * 120s), and a second try would double the wait. Our own AppErrors and every
 * other 4xx are never retried either.
 */
export function isTransientAiError(error: unknown): boolean {
  if (error instanceof AppError || isTimeoutError(error)) return false;

  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") return isTransientStatus(status);

  return isNetworkError(error);
}

export type AiRetryOptions<T> = {
  delayMs?: number;
  /** For APIs that answer errors instead of throwing (the chat REST call). */
  retryResult?: (result: T) => boolean;
};

/**
 * Run an AI call, and run it once more after a short wait when it fails in a
 * way that may pass (see isTransientAiError). The second result or error is final.
 */
export async function withAiRetry<T>(
  call: () => Promise<T>,
  { delayMs = AI_RETRY_DELAY_MS, retryResult }: AiRetryOptions<T> = {}
): Promise<T> {
  try {
    const result = await call();
    if (!retryResult?.(result)) return result;
    logger.warn("AI call answered with a temporary error; retrying once");
  } catch (error) {
    if (!isTransientAiError(error)) throw error;
    logger.warn({ err: error }, "AI call failed; retrying once");
  }

  await sleep(delayMs);
  return call();
}
