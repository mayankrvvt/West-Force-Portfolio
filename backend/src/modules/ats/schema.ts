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
      jobTitle: z
        .string({ error: "Job title must be text." })
        .trim()
        .max(200, { error: "Job title is too long." })
        .optional(),
      // The employer's name, left out of the job keywords.
      company: z
        .string({ error: "Company must be text." })
        .trim()
        .max(200, { error: "Company is too long." })
        .optional(),
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
 * What we accept from Gemini: advice only. The score is worked out by code
 * (scoring.ts), so any "score" the AI sends is dropped here.
 */
export const atsAdvice = z.object({
  suggestions: textList(8, 500),
  summary: z
    .string()
    .catch("")
    .transform((value) => value.trim().slice(0, 2000)),
});

export type AtsAdvice = z.output<typeof atsAdvice>;

/** GET /api/ats/history?resumeId&limit */
export const atsHistoryQuery = z.preprocess(
  orEmpty,
  z.object({
    resumeId: z.string({ error: "Resume id must be text." }).trim().optional(),
    limit: z.coerce
      .number({ error: "Limit must be a number." })
      .int({ error: "Limit must be a whole number." })
      .min(1, { error: "Limit must be at least 1." })
      .max(50, { error: "Limit can be at most 50." })
      .default(20),
  })
);

export type AtsHistoryQuery = z.output<typeof atsHistoryQuery>;
