import type { Request, Response } from "express";
import { failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { currentUser } from "../../middleware/auth";
import { dashboardSummary } from "./service";

export async function getSummary(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;

  const summary = await failWith("Failed to load dashboard.", () => dashboardSummary(uid));

  ok(res, summary);
}
