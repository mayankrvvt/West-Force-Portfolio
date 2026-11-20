import mongoose, { type Types } from "mongoose";
import { logger } from "../../lib/logger";
import { AppError } from "../../lib/errors";
import Job, { LISTED_SOURCES, type JobDocument } from "./model";
import { CANADA_LOCATION_FILTER, PROVINCES, type ProvinceCode } from "./sources/canada";
import { isObjectId } from "../../lib/validate";
import type { JobSearchQuery } from "./schema";
import { buildProfile, canMatch, scoreJob, type MatchProfile } from "./match";
import Portfolio from "../portfolios/model";
import { latestResumeForMatching } from "../resumes/service";
import User, { type UserDocument } from "../users/model";

export type JobSearchResult = {
  jobs: JobDocument[];
  total: number;
  page: number;
  limit: number;
  cached: boolean;
};

/**
 * Only jobs we may show: from a listed source (collected or manual), located
 * in Canada, not hidden and not expired. Old rows from dropped sources
 * (Adzuna) or outside Canada never match.
 */
function listed(...conditions: Record<string, unknown>[]): Record<string, unknown> {
  return {
    $and: [
      { source: { $in: LISTED_SOURCES } },
      CANADA_LOCATION_FILTER,
      { hidden: { $ne: true } },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
      ...conditions,
    ],
  };
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const wholeWord = (word: string, flags = "i") => new RegExp(`(^|\\W)${escapeRegex(word)}(\\W|$)`, flags);

/** Case-insensitive whole-word regex filters: every word of `text` must be in `field`. */
function allWords(field: string, text: string): Record<string, RegExp>[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ [field]: wholeWord(word) }));
}

/**
 * Every typed location word must be a whole word in the location, except that
 * a province typed as a name or a code matches either form ("Ontario" or "ON"),
 * so "Toronto Ontario", "Toronto, ON" and "toronto" all find "Toronto, ON".
 * Stored codes only count in capitals, so the word "on" in a place name does not.
 */
function locationWords(text: string): Record<string, unknown>[] {
  let typed = text;
  for (const [code, name] of Object.entries(PROVINCES)) {
    typed = typed.replace(new RegExp(`\\b${escapeRegex(name)}\\b`, "gi"), code);
  }
  return typed
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((word) => {
      const code = word.toUpperCase();
      if (!(code in PROVINCES)) return { location: wholeWord(word) };
      const name = PROVINCES[code as ProvinceCode];
      return { $or: [{ location: wholeWord(code, "") }, { location: wholeWord(name) }] };
    });
}

/** Search the jobs the daily collector stored (no outside calls). */
export async function searchCollectedJobs(search: JobSearchQuery): Promise<JobSearchResult> {
  const conditions = [...allWords("title", search.query), ...locationWords(search.location)];
  const filter = listed(...conditions);

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort({ postedAt: -1, _id: -1 })
      .skip((search.page - 1) * search.limit)
      .limit(search.limit),
    Job.countDocuments(filter),
  ]);

  return { jobs, total, page: search.page, limit: search.limit, cached: false };
}

/** GET /api/jobs: search the collected Canadian jobs. No jobs gives an empty list. */
export const searchJobs = searchCollectedJobs;

/** Jobs posted in the last NEW_DAYS get isNew: true on /api/jobs/for-me. */
export const NEW_DAYS = 3;
/** How many listed jobs are scored, and how many of the best come back. */
const FOR_ME_CANDIDATES = 300;
const FOR_ME_LIMIT = 20;
/** Skills sent to the text search; scoring also only counts the first 40. */
const SEARCH_SKILLS = 40;

export type RankedJob = Record<string, unknown> & { isNew: boolean; score: number; reasons: string[] };

/**
 * Listed jobs worth scoring: text matches for the titles and skills first,
 * otherwise the newest jobs (a fresh database may not have the text index).
 */
async function forMeCandidates(
  profile: MatchProfile,
  hiddenIds: Types.ObjectId[] = [],
  postedSince?: Date
): Promise<JobDocument[]> {
  const notHidden = [
    ...(hiddenIds.length ? [{ _id: { $nin: hiddenIds } }] : []),
    ...(postedSince ? [{ postedAt: { $gte: postedSince } }] : []),
  ];
  // Quotes and a leading "-" mean phrase and "not" in $text, so keep plain words only.
  const words = [...profile.titles, ...profile.skills.slice(0, SEARCH_SKILLS)]
    .join(" ")
    .replace(/["\\]/g, " ")
    .replace(/(^|\s)-+/g, "$1")
    .trim();
  if (words) {
    try {
      const matches = await Job.find(
        { $text: { $search: words }, ...listed(...notHidden) },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(FOR_ME_CANDIDATES);
      if (matches.length > 0) return matches;
    } catch (error) {
      logger.warn({ err: error }, "Job text search failed; scoring newest jobs");
    }
  }

  return Job.find(listed(...notHidden)).sort({ postedAt: -1, _id: -1 }).limit(FOR_ME_CANDIDATES);
}

/** How many "Not interested" jobs a user keeps; the oldest drop off first. */
export const HIDDEN_JOBS_CAP = 500;

/** Mark a listed job "Not interested" for this user (idempotent, moves it to newest). */
export async function hideJobForUser(user: UserDocument, jobId: string): Promise<void> {
  const job = await getJob(jobId);
  // One atomic pipeline update: drop any earlier copy, append, keep the newest HIDDEN_JOBS_CAP.
  const others = { $filter: { input: { $ifNull: ["$hiddenJobIds", []] }, cond: { $ne: ["$$this", job._id] } } };
  const pipeline = [{ $set: { hiddenJobIds: { $slice: [{ $concatArrays: [others, [job._id]] }, -HIDDEN_JOBS_CAP] } } }];
  await User.updateOne({ _id: user._id }, pipeline, { updatePipeline: true });
}

/** Undo "Not interested". Works even if the job has since been removed. */
export async function unhideJobForUser(user: UserDocument, jobId: string): Promise<void> {
  await User.updateOne({ _id: user._id }, { $pull: { hiddenJobIds: new mongoose.Types.ObjectId(jobId) } });
}

/**
 * GET /api/jobs/for-me: the best listed jobs for this user, scored from their
 * job preferences, latest resume and portfolio skills (see match.ts). No AI
 * and nothing is stored. No titles or skills gives an empty list.
 * `postedSince` keeps only jobs posted since then, before scoring and the
 * top FOR_ME_LIMIT cut (the weekly digest uses it).
 */
export async function rankJobsForUser(
  user: UserDocument,
  now = new Date(),
  { postedSince }: { postedSince?: Date } = {}
): Promise<RankedJob[]> {
  const [resume, portfolio] = await Promise.all([
    latestResumeForMatching(user.firebaseUid),
    Portfolio.findOne({ userId: user._id }).select("skills").lean(),
  ]);
  const profile = buildProfile({ preferences: user.jobPreferences, resume, portfolioSkills: portfolio?.skills });
  if (!canMatch(profile)) return [];

  const newSince = now.getTime() - NEW_DAYS * 24 * 60 * 60 * 1000;
  const postedTime = (job: JobDocument) => job.postedAt?.getTime() ?? 0;

  return (await forMeCandidates(profile, user.hiddenJobIds ?? [], postedSince))
    .map((job) => ({ job, ...scoreJob(job, profile, now) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || postedTime(b.job) - postedTime(a.job))
    .slice(0, FOR_ME_LIMIT)
    .map(({ job, score, reasons }) => {
      const { score: _textScore, ...fields } = job.toJSON() as Record<string, unknown>;
      return { ...fields, isNew: postedTime(job) >= newSince, score, reasons };
    });
}

/** One listed job (collected, in Canada), or 404. */
export async function getJob(id: string): Promise<JobDocument> {
  const job = isObjectId(id) ? await Job.findOne(listed({ _id: id })) : null;

  if (!job) throw new AppError(404, "Job not found.");

  return job;
}

/**
 * Up to `limit` listed jobs for the dashboard: text matches for `hint` (e.g.
 * the latest resume's target role) first, otherwise the newest jobs.
 */
export async function recommendedJobs(
  hint: string | undefined,
  limit: number,
  excludeIds: Types.ObjectId[] = []
): Promise<JobDocument[]> {
  const notApplied = listed(excludeIds.length ? { _id: { $nin: excludeIds } } : {});

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
