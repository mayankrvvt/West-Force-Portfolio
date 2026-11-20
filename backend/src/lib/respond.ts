import type { Response } from "express";

/**
 * Send a success JSON body. The payload stays at the top level (no `data`
 * wrapper) so existing clients keep working; `success: true` is added.
 */
export function ok(
  res: Response,
  payload: Record<string, unknown> = {},
  status = 200
): Response {
  return res.status(status).json({ success: true, ...payload });
}
