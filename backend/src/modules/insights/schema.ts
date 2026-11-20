import { z } from "zod";
import { toText } from "../../lib/text";

export const DEFAULT_DAYS = 30;
export const MIN_DAYS = 1;
export const MAX_DAYS = 90;

/** ?days=N, clamped to 1–90. Missing or not a number means 30. */
export function clampDays(value: unknown): number {
  const days = Math.trunc(Number(toText(value).trim() || DEFAULT_DAYS));
  if (!Number.isFinite(days)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, days));
}

/** GET /api/insights/me */
export const insightsQuery = z.looseObject({
  days: z.preprocess(clampDays, z.number().int()),
});
