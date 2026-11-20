import { toText } from "../../../lib/text";
import { isInCanada } from "./canada";
import { blankJob, fetchJson, htmlToText, toDate, type CollectedJob } from "./common";

type GreenhouseJob = {
  id?: unknown;
  title?: unknown;
  location?: { name?: unknown } | null;
  absolute_url?: unknown;
  first_published?: unknown;
  updated_at?: unknown;
  content?: unknown;
  company_name?: unknown;
  departments?: { name?: unknown }[] | null;
};

/** Map one Greenhouse job, or null when it has no id/title or is not in Canada. */
export function mapGreenhouseJob(job: GreenhouseJob, slug: string): CollectedJob | null {
  const location = toText(job.location?.name).trim();
  const externalId = toText(job.id);
  const title = toText(job.title).trim();

  if (!externalId || !title || !isInCanada(location)) return null;

  return {
    ...blankJob("greenhouse"),
    externalId: `${slug}:${externalId}`,
    title,
    company: toText(job.company_name).trim() || slug,
    location,
    description: htmlToText(job.content),
    url: toText(job.absolute_url),
    postedAt: toDate(job.first_published) ?? toDate(job.updated_at),
    tags: (job.departments ?? []).map((d) => toText(d?.name).trim()).filter(Boolean),
  };
}

/** Canadian jobs on one company's public Greenhouse board. */
export async function fetchGreenhouse(slug: string): Promise<CollectedJob[]> {
  const body = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`
  )) as { jobs?: unknown };

  const jobs = Array.isArray(body?.jobs) ? (body.jobs as GreenhouseJob[]) : [];

  return jobs
    .map((job) => mapGreenhouseJob(job, slug))
    .filter((job): job is CollectedJob => job !== null);
}
