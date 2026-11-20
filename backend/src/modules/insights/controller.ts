import type { Request, Response } from "express";
import { failWith } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { slugParams } from "../portfolios/schema";
import type { EventType } from "./model";
import { insightsQuery } from "./schema";
import { insightsSummary, recordForSlug, type VisitorContext } from "./service";

/** IP and user agent go only into the hash; they are never stored or logged here. */
export function visitorContext(req: Request): VisitorContext {
  return {
    ip: req.ip ?? "",
    userAgent: req.get("user-agent") ?? "",
    authorization: req.get("authorization"),
  };
}

/**
 * Fire and forget: record an event for a public portfolio request.
 * Never throws and never delays the response it is called from.
 */
export function trackInBackground(
  req: Request,
  input: { slug: string; type: EventType; documentId?: string }
): void {
  const visitor = visitorContext(req);

  recordForSlug({ ...input, visitor }).catch((error: unknown) => {
    (req.log ?? logger).warn(
      { reason: error instanceof Error ? error.message : String(error), type: input.type },
      "Portfolio insight not recorded"
    );
  });
}

/** POST /api/insights/portfolios/:slug/view (public). */
export async function recordView(req: Request, res: Response): Promise<void> {
  const { slug } = parse(slugParams, req.params);

  const recorded = await failWith("Unable to record the view.", () =>
    recordForSlug({ slug, type: "view", visitor: visitorContext(req) })
  );

  ok(res, { recorded });
}

/** GET /api/insights/me?days=30 (signed in). */
export async function getMyInsights(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const { days } = parse(insightsQuery, req.query);

  const summary = await failWith("Failed to load portfolio insights.", () =>
    insightsSummary(uid, days)
  );

  ok(res, summary);
}
