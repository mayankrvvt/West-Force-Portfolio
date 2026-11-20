import type { AnyBulkWriteOperation } from "mongoose";
import { config } from "../../lib/config";
import { logger } from "../../lib/logger";
import User from "../users/model";
import Job, { COLLECTED_SOURCES, MANUAL_SOURCE, type JobAttrs } from "./model";
import type { CollectedJob } from "./sources/common";
import { GREENHOUSE_COMPANIES, LEVER_COMPANIES } from "./sources/companies";
import { fetchGreenhouse } from "./sources/greenhouse";
import { fetchJooble } from "./sources/jooble";
import { fetchLever } from "./sources/lever";

/** Collected jobs posted longer ago than this are deleted. */
export const KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CollectOptions = {
  joobleApiKey?: string;
  greenhouse?: string[];
  lever?: string[];
  now?: Date;
};

export type CollectSummary = {
  tried: number;
  failed: number;
  fetched: number;
  added: number;
  updated: number;
  removed: number;
};

type Task = { name: string; run: () => Promise<CollectedJob[]> };

/** One search per unique title + city across all users' job preferences. */
export async function preferenceSearches(): Promise<{ title: string; city: string }[]> {
  const users = await User.find({ "jobPreferences.titles.0": { $exists: true } })
    .select("jobPreferences")
    .lean();

  const searches = new Map<string, { title: string; city: string }>();

  for (const user of users) {
    const city = user.jobPreferences?.city?.trim() ?? "";
    for (const raw of user.jobPreferences?.titles ?? []) {
      const title = raw.trim();
      const key = `${title.toLowerCase()}|${city.toLowerCase()}`;
      if (title && !searches.has(key)) searches.set(key, { title, city });
    }
  }

  return [...searches.values()];
}

/**
 * Fetch Canadian jobs from every source, upsert them by source + external id
 * and delete collected jobs older than KEEP_DAYS. A failing source is logged
 * and skipped; it never stops the others.
 */
export async function collectJobs(options: CollectOptions = {}): Promise<CollectSummary> {
  const {
    joobleApiKey = config.JOOBLE_API_KEY,
    greenhouse = GREENHOUSE_COMPANIES,
    lever = LEVER_COMPANIES,
    now = new Date(),
  } = options;

  const tasks: Task[] = [
    ...greenhouse.map((slug) => ({ name: `greenhouse:${slug}`, run: () => fetchGreenhouse(slug) })),
    ...lever.map((slug) => ({ name: `lever:${slug}`, run: () => fetchLever(slug) })),
  ];

  if (joobleApiKey) {
    for (const search of await preferenceSearches()) {
      tasks.push({
        name: `jooble:${search.title}|${search.city}`,
        run: () => fetchJooble(joobleApiKey, search),
      });
    }
  } else {
    logger.info("JOOBLE_API_KEY not set; skipping Jooble");
  }

  // Keyed by source + external id, so a job found twice is stored once.
  const jobs = new Map<string, CollectedJob>();
  const cutoff = new Date(now.getTime() - KEEP_DAYS * DAY_MS);
  let failed = 0;

  // One at a time: gentle on the free APIs and easy to read in the logs.
  for (const task of tasks) {
    try {
      const found = await task.run();
      for (const job of found) {
        // An undated job counts as posted now; it is only stored as such on insert.
        if ((job.postedAt ?? now) >= cutoff) jobs.set(`${job.source}|${job.externalId}`, job);
      }
      logger.info({ source: task.name, count: found.length }, "Collected jobs");
    } catch (error) {
      failed += 1;
      logger.warn(
        { source: task.name, reason: error instanceof Error ? error.message : "unknown" },
        "Job source failed"
      );
    }
  }

  let added = 0;
  let updated = 0;

  if (jobs.size > 0) {
    const operations: AnyBulkWriteOperation<JobAttrs>[] = [...jobs.values()].map(
      ({ postedAt, ...job }) => ({
        updateOne: {
          filter: { source: job.source, externalId: job.externalId },
          // Without a source date, postedAt is the first time we saw the job, so
          // it is set on insert only and the job still ages out after KEEP_DAYS.
          update: postedAt ? { $set: { ...job, postedAt } } : { $set: job, $setOnInsert: { postedAt: now } },
          upsert: true,
        },
      })
    );
    const result = await Job.bulkWrite(operations, { ordered: false });
    added = result.upsertedCount;
    updated = result.modifiedCount;
  }

  // Old jobs, plus any left over from dropped sources (Adzuna). Jobs the admin
  // added by hand are never removed here; they hide when they expire.
  const { deletedCount: removed } = await Job.deleteMany({
    source: { $ne: MANUAL_SOURCE },
    $or: [{ postedAt: { $lt: cutoff } }, { source: { $nin: COLLECTED_SOURCES } }],
  });

  const summary: CollectSummary = {
    tried: tasks.length,
    failed,
    fetched: jobs.size,
    added,
    updated,
    removed,
  };
  logger.info(summary, "Job collection finished");

  return summary;
}
