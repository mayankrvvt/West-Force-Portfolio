import { z } from "zod";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined || value === null ? {} : value);

export const MAX_RESUME_TEXT = 50_000;
export const MAX_JOB_DESCRIPTION = 20_000;

/** POST /api/ats/check: a resume (pasted text or a saved resume id) and the job description. */
export const atsCheckBody = z.preprocess(
  orEmpty,
  z
    .object({
      resumeText: z
        .string({ error: "Resume text must be text." })
        .trim()
        .max(MAX_RESUME_TEXT, { error: "Resume text is too long." })
        .optional(),
      resumeId: z.string({ error: "Resume id must be text." }).trim().optional(),
      jobDescription: z
        .string({ error: "Job description is required." })
        .trim()
        .min(1, { error: "Job description is required." })
        .max(MAX_JOB_DESCRIPTION, { error: "Job description is too long." }),
    })
    .refine((body) => body.resumeText || body.resumeId, {
      error: "Send resume text or a saved resume.",
    })
);

export type AtsCheckBody = z.output<typeof atsCheckBody>;

/* ---------- Gemini output ---------- */

/** A keyword may come back as "React" or { keyword: "React", ... }. */
function keywordText(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    const { keyword, name, term } = item as Record<string, unknown>;
    const value = [keyword, name, term].find((entry) => typeof entry === "string");
    return typeof value === "string" ? value.trim() : "";
  }
  return "";
}

/** Any list -> unique, non-empty, trimmed strings, capped in count and length. */
const textList = (maxItems: number, maxLength: number) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const item of items) {
        const text = keywordText(item).slice(0, maxLength);
        const key = text.toLowerCase();
        if (!text || seen.has(key)) continue;
        seen.add(key);
        out.push(text);
        if (out.length >= maxItems) break;
      }
      return out;
    });

/**
 * What we accept from Gemini. The score must be a number (or numeric string)
 * and is clamped to 0-100; every other field falls back to empty.
 */
export const atsGeminiResult = z.object({
  score: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? Number(value) : value),
    z
      .number()
      .refine(Number.isFinite)
      .transform((value) => Math.min(100, Math.max(0, Math.round(value))))
  ),
  matchedKeywords: textList(40, 80),
  missingKeywords: textList(40, 80),
  suggestions: textList(10, 500),
  summary: z
    .string()
    .catch("")
    .transform((value) => value.trim().slice(0, 2000)),
});

export type AtsResult = z.output<typeof atsGeminiResult>;
