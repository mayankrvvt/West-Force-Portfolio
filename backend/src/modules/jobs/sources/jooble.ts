import { toText } from "../../../lib/text";
import { isInCanada } from "./canada";
import { blankJob, fetchJson, htmlToText, toDate, type CollectedJob } from "./common";

type JoobleJob = {
  id?: unknown;
  title?: unknown;
  company?: unknown;
  location?: unknown;
  snippet?: unknown;
  type?: unknown;
  link?: unknown;
  updated?: unknown;
};

/** Map one Jooble result, or null when it has no id/title or is not in Canada. */
export function mapJoobleJob(job: JoobleJob): CollectedJob | null {
  const externalId = toText(job.id);
  const title = htmlToText(job.title);
  const location = toText(job.location).trim();

  if (!externalId || !title || !isInCanada(location)) return null;

  return {
    ...blankJob("jooble"),
    externalId,
    title,
    company: toText(job.company).trim(),
    location,
    type: toText(job.type).trim(),
    description: htmlToText(job.snippet),
    url: toText(job.link),
    postedAt: toDate(job.updated),
  };
}

/**
 * One Jooble search. The API key is part of the URL, so the URL is never
 * logged (fetchJson keeps it out of its errors too).
 */
export async function fetchJooble(
  apiKey: string,
  search: { title: string; city: string }
): Promise<CollectedJob[]> {
  const body = (await fetchJson(`https://jooble.org/api/${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keywords: search.title,
      location: search.city ? `${search.city}, Canada` : "Canada",
    }),
  })) as { jobs?: unknown };

  const jobs = Array.isArray(body?.jobs) ? (body.jobs as JoobleJob[]) : [];

  return jobs.map(mapJoobleJob).filter((job): job is CollectedJob => job !== null);
}
