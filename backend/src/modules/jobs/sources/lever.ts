import { toText } from "../../../lib/text";
import { isInCanada } from "./canada";
import { blankJob, fetchJson, toDate, type CollectedJob } from "./common";

type LeverPosting = {
  id?: unknown;
  text?: unknown;
  categories?: {
    commitment?: unknown;
    department?: unknown;
    team?: unknown;
    location?: unknown;
    allLocations?: unknown;
  } | null;
  country?: unknown;
  workplaceType?: unknown;
  createdAt?: unknown;
  hostedUrl?: unknown;
  descriptionPlain?: unknown;
  salaryRange?: { min?: unknown; max?: unknown } | null;
};

const money = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;

/** Map one Lever posting, or null when it has no id/title or is not in Canada. */
export function mapLeverPosting(posting: LeverPosting, slug: string): CollectedJob | null {
  const categories = posting.categories ?? {};
  const all = Array.isArray(categories.allLocations)
    ? categories.allLocations.map((place) => toText(place).trim()).filter(Boolean)
    : [];
  const places = all.length ? all : [toText(categories.location).trim()].filter(Boolean);
  let location = places.join("; ");

  const inCanada = posting.country === "CA" || isInCanada(location);
  const externalId = toText(posting.id);
  const title = toText(posting.text).trim();

  if (!externalId || !title || !inCanada) return null;

  // Lever may say country "CA" with a bare city; name Canada so search finds it.
  if (!isInCanada(location)) location = location ? `${location}, Canada` : "Canada";

  if (posting.workplaceType === "remote" && !/remote/i.test(location)) {
    location = location ? `Remote, ${location}` : "Remote, Canada";
  }

  return {
    ...blankJob("lever"),
    externalId: `${slug}:${externalId}`,
    title,
    company: slug.charAt(0).toUpperCase() + slug.slice(1),
    location,
    type: toText(categories.commitment).trim(),
    salaryMin: money(posting.salaryRange?.min),
    salaryMax: money(posting.salaryRange?.max),
    description: toText(posting.descriptionPlain).replace(/\s+/g, " ").trim().slice(0, 4000),
    url: toText(posting.hostedUrl),
    postedAt: toDate(posting.createdAt),
    tags: [toText(categories.department), toText(categories.team)]
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

/** Canadian postings on one company's public Lever page. */
export async function fetchLever(slug: string): Promise<CollectedJob[]> {
  const body = await fetchJson(
    `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`
  );

  const postings = Array.isArray(body) ? (body as LeverPosting[]) : [];

  return postings
    .map((posting) => mapLeverPosting(posting, slug))
    .filter((job): job is CollectedJob => job !== null);
}
