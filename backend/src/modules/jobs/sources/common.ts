import type { CollectedSource } from "../model";

/** One collected job, in the same shape the Job model stores. */
export type CollectedJob = {
  externalId: string;
  source: CollectedSource;
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

/** One outside request may take this long before it is given up. */
export const SOURCE_TIMEOUT_MS = 15 * 1000;

/** Long descriptions are cut to this many characters. */
const MAX_DESCRIPTION = 4000;

/**
 * GET or POST JSON with a timeout. Throws a short error on failure; the URL is
 * never put in the error because the Jooble URL holds the API key.
 */
export async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  return response.json();
}

const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&amp;": "&",
};

function decodeEntities(value: string): string {
  return value.replace(/&(lt|gt|quot|#39|nbsp|amp);/g, (match) => ENTITIES[match] ?? match);
}

/** Decode until nothing changes (a few rounds), so "&amp;lt;b&amp;gt;" becomes "<b>". */
function decodeAllEntities(value: string): string {
  let text = value;
  for (let round = 0; round < 3; round += 1) {
    const next = decodeEntities(text);
    if (next === text) break;
    text = next;
  }
  return text;
}

/** A real tag starts with a letter or "/" plus a letter. No "<" inside, so matching stays linear. */
const TAG = /<\/?[a-zA-Z][^<>]*>/g;

/** Closing block tags and <br> that start a new line when line breaks are kept. */
const PARAGRAPH_END = /<\/p\s*>/gi;
const LINE_END = /<br\s*\/?>|<\/(?:li|ul|ol|div|h[1-6]|tr)\s*>/gi;

/**
 * HTML (escaped or not) to plain text, cut to `max` characters. Entities are
 * decoded before tags are stripped, so an escaped tag never comes back as a
 * real one. Collected jobs collapse all whitespace; `keepLines` (manual jobs)
 * keeps line breaks, at most 2 in a row.
 */
export function htmlToText(value: unknown, max = MAX_DESCRIPTION, { keepLines = false } = {}): string {
  if (typeof value !== "string") return "";

  let text = decodeAllEntities(value);

  if (keepLines) {
    text = text
      .replace(/\r\n?/g, "\n")
      .replace(PARAGRAPH_END, "\n\n")
      .replace(LINE_END, "\n")
      .replace(TAG, " ")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else {
    text = text.replace(TAG, " ").replace(/\s+/g, " ").trim();
  }

  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** An ISO string or a millisecond timestamp to a Date, or null. */
export function toDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Fields every collected job starts with; sources fill in the rest. */
export function blankJob(source: CollectedSource): CollectedJob {
  return {
    source,
    externalId: "",
    title: "",
    company: "",
    location: "",
    type: "",
    salaryMin: null,
    salaryMax: null,
    description: "",
    url: "",
    postedAt: null,
    tags: [],
  };
}
