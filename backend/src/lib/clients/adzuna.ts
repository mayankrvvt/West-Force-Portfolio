import { config } from "../config";
import { AppError } from "../errors";
import { logger } from "../logger";
import { toText } from "../text";

// Fail a hung Adzuna request instead of waiting forever.
export const ADZUNA_TIMEOUT_MS = 10 * 1000;
const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";

export const JOBS_NOT_CONFIGURED = "JOBS_NOT_CONFIGURED";

/** One job in our own shape (what the Job model stores). */
export type JobInput = {
  externalId: string;
  source: "adzuna";
  title: string;
  company: string;
  location: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  url: string;
  postedAt: Date | null;
  tags: string[];
};

export type AdzunaSearch = {
  query: string;
  location: string;
  page: number;
  limit: number;
};

export function isAdzunaConfigured(): boolean {
  return Boolean(config.ADZUNA_APP_ID && config.ADZUNA_APP_KEY);
}

/** One Adzuna result. Fields are unknown: it is third-party JSON. */
type AdzunaResult = {
  id?: unknown;
  title?: unknown;
  contract_time?: unknown;
  contract_type?: unknown;
  category?: { label?: unknown } | null;
  company?: { display_name?: unknown } | null;
  location?: { display_name?: unknown } | null;
  salary_min?: unknown;
  salary_max?: unknown;
  description?: unknown;
  redirect_url?: unknown;
  created?: unknown;
};

type AdzunaResponse = { results?: unknown; count?: unknown };

/** Adzuna wraps matched words in <strong>; keep plain text only. */
function plain(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
    : "";
}

function money(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function date(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const CONTRACT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  permanent: "Permanent",
};

/** Map one Adzuna result to our Job shape, or null if it has no id/title. */
export function mapAdzunaResult(result: AdzunaResult): JobInput | null {
  const externalId = result?.id === undefined || result?.id === null ? "" : toText(result.id);
  const title = plain(result?.title);

  if (!externalId || !title) return null;

  const timeLabel = CONTRACT_LABELS[toText(result.contract_time)] ?? "";
  const typeLabel = CONTRACT_LABELS[toText(result.contract_type)] ?? "";
  const category = plain(result.category?.label);
  const tags = [category, typeLabel].filter(
    (tag, index, all) => tag && tag !== "Unknown" && all.indexOf(tag) === index
  );

  return {
    externalId,
    source: "adzuna",
    title,
    company: plain(result.company?.display_name),
    location: plain(result.location?.display_name),
    type: timeLabel || typeLabel,
    salaryMin: money(result.salary_min),
    salaryMax: money(result.salary_max),
    description: plain(result.description),
    url: typeof result.redirect_url === "string" ? result.redirect_url : "",
    postedAt: date(result.created),
    tags,
  };
}

function isTimeout(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

/**
 * Search Adzuna. Throws AppError 503 JOBS_NOT_CONFIGURED without keys, 504 on
 * timeout and 502 on any other failure. The request URL holds the app key, so
 * it is never logged or put into an error.
 */
export async function searchAdzuna(
  search: AdzunaSearch
): Promise<{ jobs: JobInput[]; total: number }> {
  if (!isAdzunaConfigured()) {
    throw new AppError(503, "Job search is not set up yet.", { code: JOBS_NOT_CONFIGURED });
  }

  const params = new URLSearchParams({
    app_id: config.ADZUNA_APP_ID ?? "",
    app_key: config.ADZUNA_APP_KEY ?? "",
    results_per_page: String(search.limit),
  });
  if (search.query) params.set("what", search.query);
  if (search.location) params.set("where", search.location);

  const url = `${ADZUNA_BASE_URL}/${config.ADZUNA_COUNTRY}/search/${search.page}?${params.toString()}`;

  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(ADZUNA_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeout(error)) {
      throw new AppError(504, "Job search took too long. Please try again.");
    }
    logger.warn(
      { reason: error instanceof Error ? error.name : "unknown" },
      "Adzuna request failed"
    );
    throw new AppError(502, "Job search is unavailable right now. Please try again later.");
  }

  if (!response.ok) {
    logger.warn({ status: response.status }, "Adzuna returned an error status");
    throw new AppError(502, "Job search is unavailable right now. Please try again later.");
  }

  let body: AdzunaResponse;

  try {
    body = (await response.json()) as AdzunaResponse;
  } catch (error) {
    if (isTimeout(error)) {
      throw new AppError(504, "Job search took too long. Please try again.");
    }
    logger.warn("Adzuna returned invalid JSON");
    throw new AppError(502, "Job search is unavailable right now. Please try again later.");
  }

  const results: AdzunaResult[] = Array.isArray(body?.results) ? (body.results as AdzunaResult[]) : [];
  const jobs = results.map(mapAdzunaResult).filter((job): job is JobInput => job !== null);
  const total = typeof body?.count === "number" ? body.count : jobs.length;

  return { jobs, total };
}
