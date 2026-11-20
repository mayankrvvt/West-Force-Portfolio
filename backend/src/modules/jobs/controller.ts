import type { Request, Response } from "express";
import { AppError, failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { idParams, objectIdParams, parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { findUserByUid } from "../users/service";
import { jobSearchQuery } from "./schema";
import { getJob, hideJobForUser, rankJobsForUser, searchJobs, unhideJobForUser } from "./service";

/** GET /api/jobs/for-me: the best listed jobs for the caller, with reasons. */
export async function listJobsForMe(req: Request, res: Response): Promise<void> {
  const jobs = await failWith("Failed to load jobs.", async () => {
    const user = await findUserByUid(currentUser(req).uid);
    if (!user) throw new AppError(404, "User not found.");
    return rankJobsForUser(user);
  });

  ok(res, { jobs });
}

/** POST /api/jobs/:id/hide: "Not interested", so jobs for you skips it. */
export async function hideJob(req: Request, res: Response): Promise<void> {
  const { id } = parse(objectIdParams("Invalid job id."), req.params);
  const user = await findUserByUid(currentUser(req).uid);
  if (!user) throw new AppError(404, "User not found.");

  await failWith("Failed to hide job.", () => hideJobForUser(user, id));

  ok(res, { hidden: true });
}

/** DELETE /api/jobs/:id/hide: undo "Not interested". */
export async function unhideJob(req: Request, res: Response): Promise<void> {
  const { id } = parse(objectIdParams("Invalid job id."), req.params);
  const user = await findUserByUid(currentUser(req).uid);
  if (!user) throw new AppError(404, "User not found.");

  await failWith("Failed to unhide job.", () => unhideJobForUser(user, id));

  ok(res, { hidden: false });
}

export async function listJobs(req: Request, res: Response): Promise<void> {
  const search = parse(jobSearchQuery, req.query);

  const result = await failWith("Failed to search jobs.", () => searchJobs(search));

  req.log.info(
    { page: result.page, count: result.jobs.length, cached: result.cached },
    "Job search"
  );

  ok(res, { ...result });
}

export async function getOneJob(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParams, req.params);

  const job = await failWith("Failed to load job.", () => getJob(id));

  ok(res, { job });
}
