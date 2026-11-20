import { STOPWORDS, stem, tokenize } from "../ats/keywords";
import { foldPlace, PROVINCES, provinceOf, type ProvinceCode } from "./sources/canada";

/**
 * "Jobs for you" matching. Pure and deterministic: no database, no AI.
 * A job must match a title or a skill to score at all; the place and how new
 * it is only move matching jobs up or down.
 */

export type MatchProfile = {
  titles: string[];
  skills: string[];
  city: string;
  /** Province or territory code, or "" when unknown. */
  province: string;
  remoteOk: boolean;
};

export type MatchJob = {
  title: string;
  location?: string | null;
  description?: string | null;
  tags?: string[] | null;
  postedAt?: Date | string | null;
};

export type JobMatch = { score: number; reasons: string[] };

export const MATCH_POINTS = {
  /** Every word of one of the user's titles is in the job title. */
  titleFull: 40,
  /** Some words match: this many points times the share that match. */
  titlePart: 25,
  /** One skill, by where it shows up. Each skill counts once, at its best place. */
  skillTitle: 4,
  skillTag: 3,
  skillText: 2,
  /** All skills together, so a long noisy skills list can't outweigh the title. */
  skillTotal: 12,
  city: 15,
  province: 8,
  remote: 6,
  /** Posted in the last FRESH_DAYS, or else in the last RECENT_DAYS. */
  fresh: 3,
  recent: 1,
} as const;

const FRESH_DAYS = 3;
const RECENT_DAYS = 14;
/** Only the first skills count, so a resume with 200 skills stays quick. */
const MAX_SKILLS = 40;
const SKILLS_IN_REASON = 3;
const DAY = 24 * 60 * 60 * 1000;

/** Stems of the useful words, in order. */
const stems = (text: string) => tokenize(text).filter((word) => !STOPWORDS.has(word)).map(stem);

/** " a b c " so a phrase can be found as whole words with includes(). */
const padded = (words: string[]) => ` ${words.join(" ")} `;

const hasPhrase = (haystack: string, phrase: string[]) =>
  phrase.length > 0 && haystack.includes(padded(phrase));

/** Keep the first of each case-insensitive repeat, trimmed, dropping blanks. */
function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function titlePoints(jobTitle: string, titles: string[]): { points: number; title: string } {
  const jobWords = new Set(stems(jobTitle));
  let best = { points: 0, title: "" };

  for (const title of titles) {
    const words = [...new Set(stems(title))];
    if (words.length === 0) continue;
    const matched = words.filter((word) => jobWords.has(word)).length;
    const points =
      matched === words.length
        ? MATCH_POINTS.titleFull
        : Math.round((MATCH_POINTS.titlePart * matched) / words.length);
    if (points > best.points) best = { points, title };
  }

  return best;
}

function skillPoints(job: MatchJob, skills: string[]): { points: number; matched: string[] } {
  const title = padded(stems(job.title));
  const tags = (job.tags ?? []).map((tag) => padded(stems(tag)));
  const text = padded(stems(job.description ?? ""));

  const hits = skills
    .slice(0, MAX_SKILLS)
    .map((skill) => {
      const phrase = stems(skill);
      const points = hasPhrase(title, phrase)
        ? MATCH_POINTS.skillTitle
        : tags.some((tag) => hasPhrase(tag, phrase))
          ? MATCH_POINTS.skillTag
          : hasPhrase(text, phrase)
            ? MATCH_POINTS.skillText
            : 0;
      return { skill, points };
    })
    .filter((hit) => hit.points > 0);

  const total = hits.reduce((sum, hit) => sum + hit.points, 0);
  // Stable sort: equal points keep the profile's order.
  const matched = [...hits].sort((a, b) => b.points - a.points).map((hit) => hit.skill);

  return { points: Math.min(total, MATCH_POINTS.skillTotal), matched };
}

function placePoints(location: string, profile: MatchProfile): { points: number; reason: string } {
  const city = foldPlace(profile.city).split(" ").filter(Boolean);
  if (city.length && padded(foldPlace(location).split(" ")).includes(padded(city))) {
    return { points: MATCH_POINTS.city, reason: profile.city.trim() };
  }

  const province = (profile.province || provinceOf(profile.city)) as ProvinceCode | "";
  if (province && provinceOf(location) === province) {
    return { points: MATCH_POINTS.province, reason: PROVINCES[province] ?? province };
  }

  if (profile.remoteOk && /\bremote\b/i.test(location)) {
    return { points: MATCH_POINTS.remote, reason: "Remote" };
  }

  return { points: 0, reason: "" };
}

function freshPoints(postedAt: MatchJob["postedAt"], now: Date): number {
  if (!postedAt) return 0;
  const age = now.getTime() - new Date(postedAt).getTime();
  if (Number.isNaN(age)) return 0;
  if (age <= FRESH_DAYS * DAY) return MATCH_POINTS.fresh;
  if (age <= RECENT_DAYS * DAY) return MATCH_POINTS.recent;
  return 0;
}

/** How well one job fits the profile, with short reasons to show the user. */
export function scoreJob(job: MatchJob, profile: MatchProfile, now = new Date()): JobMatch {
  const title = titlePoints(job.title, profile.titles);
  const skills = skillPoints(job, profile.skills);
  if (title.points + skills.points === 0) return { score: 0, reasons: [] };

  const place = placePoints(job.location ?? "", profile);
  const reasons = [
    ...(title.points ? [`Title match: ${title.title}`] : []),
    ...(skills.matched.length ? [`Matches: ${skills.matched.slice(0, SKILLS_IN_REASON).join(", ")}`] : []),
    ...(place.reason ? [place.reason] : []),
  ];

  return {
    score: title.points + skills.points + place.points + freshPoints(job.postedAt, now),
    reasons,
  };
}

/** True when the profile can match anything at all. */
export const canMatch = (profile: MatchProfile) => profile.titles.length > 0 || profile.skills.length > 0;

type ProfileSources = {
  preferences?: { titles?: string[] | null; city?: string | null; province?: string | null; remoteOk?: boolean | null } | null;
  resume?: { targetRole?: string | null; content?: { title?: string | null; skills?: string[] | null } | null } | null;
  /** Portfolio skills are stored loosely: plain text or { name }. */
  portfolioSkills?: unknown[] | null;
};

const skillName = (skill: unknown): string =>
  typeof skill === "string"
    ? skill
    : skill && typeof skill === "object" && typeof (skill as { name?: unknown }).name === "string"
      ? (skill as { name: string }).name
      : "";

// The resume model's default targetRole. A resume that still has it was never
// set by the person, so it says nothing about the jobs they want.
const DEFAULT_RESUME_ROLE = "software engineer";

/** One profile from the job preferences, the latest resume and the portfolio skills. */
export function buildProfile({ preferences, resume, portfolioSkills }: ProfileSources): MatchProfile {
  const role = resume?.targetRole ?? "";
  return {
    titles: unique([
      ...(preferences?.titles ?? []),
      role.trim().toLowerCase() === DEFAULT_RESUME_ROLE ? "" : role,
      resume?.content?.title ?? "",
    ]),
    skills: unique([...(resume?.content?.skills ?? []), ...(portfolioSkills ?? []).map(skillName)]),
    city: preferences?.city?.trim() ?? "",
    province: preferences?.province?.trim() ?? "",
    remoteOk: Boolean(preferences?.remoteOk),
  };
}
