import type { AnyBulkWriteOperation, Types } from "mongoose";
import { searchAdzuna, isAdzunaConfigured, JOBS_NOT_CONFIGURED } from "../../lib/clients/adzuna";
import { config } from "../../lib/config";
import { logger } from "../../lib/logger";
import { AppError } from "../../lib/errors";
import Job, { JobSearch, type JobAttrs, type JobDocument } from "./model";
import { isObjectId } from "../../lib/validate";
import type { JobSearchQuery } from "./schema";

/** How long one search page is reused before Adzuna is asked again. */
export const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000;

export type JobSearchResult = {
  jobs: JobDocument[];
  total: number;
  page: number;
  limit: number;
  cached: boolean;
};

function cacheKey(search: JobSearchQuery): string {
  return [
    "adzuna",
    config.ADZUNA_COUNTRY,
    search.query.toLowerCase(),
    search.location.toLowerCase(),
    search.page,
    search.limit,
  ].join("|");
}

/** Jobs by id, in the given order (missing ones skipped). */
async function jobsInOrder(ids: Types.ObjectId[]): Promise<JobDocument[]> {
  const found = await Job.find({ _id: { $in: ids } });
  const byId = new Map(found.map((job) => [String(job._id), job]));
  return ids.map((id) => byId.get(String(id))).filter((job): job is JobDocument => Boolean(job));
}

/**
 * Search jobs. A query/page seen in the last hour comes from MongoDB; anything
 * else asks Adzuna once, upserts the jobs and remembers the page.
 */
export async function searchJobs(search: JobSearchQuery): Promise<JobSearchResult> {
  if (!isAdzunaConfigured()) {
    throw new AppError(503, "Job search is not set up yet.", { code: JOBS_NOT_CONFIGURED });
  }

  const key = cacheKey(search);
  const now = new Date();
  const hit = await JobSearch.findOne({ key, expiresAt: { $gt: now } });

  if (hit) {
    return {
      jobs: await jobsInOrder(hit.jobIds),
      total: hit.total,
      page: search.page,
      limit: search.limit,
      cached: true,
    };
  }

  const { jobs: fetched, total } = await searchAdzuna(search);

  if (fetched.length > 0) {
    const operations: AnyBulkWriteOperation<JobAttrs>[] = fetched.map((job) => ({
      updateOne: {
        filter: { source: job.source, externalId: job.externalId },
        update: { $set: job },
        upsert: true,
      },
    }));
    await Job.bulkWrite(operations, { ordered: false });
  }

  const stored = await Job.find({
    source: "adzuna",
    externalId: { $in: fetched.map((job) => job.externalId) },
  }).select("_id externalId");
  const idByExternal = new Map(stored.map((job) => [job.externalId, job._id]));
  const jobIds = fetched
    .map((job) => idByExternal.get(job.externalId))
    .filter((id): id is Types.ObjectId => Boolean(id));

  await JobSearch.updateOne(
    { key },
    { $set: { jobIds, total, expiresAt: new Date(now.getTime() + SEARCH_CACHE_TTL_MS) } },
    { upsert: true }
  );

  return {
    jobs: await jobsInOrder(jobIds),
    total,
    page: search.page,
    limit: search.limit,
    cached: false,
  };
}

/** One cached job, or 404. Works without Adzuna keys (it only reads MongoDB). */
export async function getJob(id: string): Promise<JobDocument> {
  const job = isObjectId(id) ? await Job.findById(id) : null;

  if (!job) throw new AppError(404, "Job not found.");

  return job;
}

/**
 * Up to `limit` cached jobs for the dashboard: text matches for `hint` (e.g.
 * the latest resume's target role) first, otherwise the newest jobs.
 */
export async function recommendedJobs(
  hint: string | undefined,
  limit: number,
  excludeIds: Types.ObjectId[] = []
): Promise<JobDocument[]> {
  const notApplied = excludeIds.length ? { _id: { $nin: excludeIds } } : {};

  if (hint?.trim()) {
    try {
      const matches = await Job.find(
        { $text: { $search: hint.trim() }, ...notApplied },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(limit);

      if (matches.length > 0) return matches;
    } catch (error) {
      // $text needs the text index; a fresh database may not have built it yet.
      logger.warn({ err: error }, "Job text search failed; showing newest jobs");
    }
  }

  return Job.find(notApplied).sort({ postedAt: -1, createdAt: -1 }).limit(limit);
}
