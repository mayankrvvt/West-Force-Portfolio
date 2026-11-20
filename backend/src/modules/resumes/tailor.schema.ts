import { z } from "zod";
import { isObjectId } from "../../lib/validate";
import { toText } from "../../lib/text";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined || value === null ? {} : value);

const trimmedText = z.preprocess((value) => toText(value).trim(), z.string());

/** Empty or missing -> "". */
const optionalShortText = z.preprocess(
  (value) => toText(value).trim(),
  z.string().max(200, "Keep this under 200 characters.")
);

const objectId = (message: string) =>
  z.preprocess((value) => toText(value), z.string().refine(isObjectId, { message }));

export const JOB_DESCRIPTION_MAX = 20_000;

/** POST /api/resumes/tailor. */
export const tailorBody = z.preprocess(
  orEmpty,
  z.looseObject({
    resumeId: objectId("Pick a saved resume to tailor."),
    jobDescription: trimmedText.pipe(
      z
        .string()
        .min(1, "Paste the job ad or pick a saved job.")
        .max(JOB_DESCRIPTION_MAX, "The job ad is too long. Keep it under 20,000 characters.")
    ),
    jobTitle: optionalShortText,
    company: optionalShortText,
    jobId: optionalShortText,
  })
);

/** POST /api/resumes/tailor/save. */
export const tailorSaveBody = z.preprocess(
  orEmpty,
  z.looseObject({
    sourceResumeId: objectId("The original resume is missing."),
    tailored: z.looseObject({}, { error: "The tailored resume is missing." }),
    jobTitle: trimmedText.pipe(
      z.string().min(1, "Add the job title.").max(200, "Keep this under 200 characters.")
    ),
    company: optionalShortText,
    jobId: optionalShortText,
  })
);

export type TailorBody = z.output<typeof tailorBody>;
export type TailorSaveBody = z.output<typeof tailorSaveBody>;

/* ---------- Gemini output ---------- */

const aiString = z.union([z.string(), z.number()]).nullish();

const aiBulletEdit = z.looseObject({
  experienceIndex: z.number().int().min(0),
  bulletIndex: z.number().int().min(0),
  text: z.string(),
  reason: aiString,
});

/**
 * What we accept from Gemini for a tailor call. Only the parts it may change:
 * the summary, existing bullets (by experience index and bullet index) and
 * skills. Anything else it sends is ignored by the honesty guard.
 */
export const aiTailor = z
  .looseObject({
    summary: aiString,
    bullets: z.array(aiBulletEdit).nullish(),
    skills: z.array(z.union([z.string(), z.number()])).nullish(),
    addedKeywords: z.array(z.union([z.string(), z.number()])).nullish(),
    reasons: z
      .looseObject({
        summary: aiString,
        skills: aiString,
      })
      .nullish(),
  })
  .refine(
    (reply) =>
      (typeof reply.summary === "string" && reply.summary.trim() !== "") ||
      Boolean(reply.bullets?.length) ||
      Boolean(reply.skills?.length),
    { error: "The tailored resume is empty." }
  );

export type AiTailor = z.output<typeof aiTailor>;
