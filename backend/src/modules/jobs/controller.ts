import type { Request, Response } from "express";
import { failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { idParams, parse } from "../../lib/validate";
import { jobSearchQuery } from "./schema";
import { getJob, searchJobs } from "./service";

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
