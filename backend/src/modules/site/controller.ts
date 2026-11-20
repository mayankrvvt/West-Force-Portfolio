import type { Request, Response } from "express";
import { failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { getSiteSettings, publicStatus } from "./service";

/** GET /api/site/status: public, no sign in. Maintenance, banner and switches. */
export async function getSiteStatus(_req: Request, res: Response): Promise<void> {
  const settings = await failWith("Failed to load the site status.", () => getSiteSettings());

  ok(res, { ...publicStatus(settings) });
}
