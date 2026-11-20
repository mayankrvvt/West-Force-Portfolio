import { z } from "zod";
import { objectIdParams } from "../../lib/validate";
import { toText } from "../../lib/text";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined || value === null ? {} : value);

/** Empty or missing -> undefined (the AI service then uses its default). */
const optionalText = z.preprocess(
  (value) => (value === undefined || value === null || value === "" ? undefined : toText(value)),
  z.string().optional()
);

/** Multipart fields arrive as JSON strings; bad JSON falls back to {} as before. */
const jsonField = z.preprocess((value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}, z.unknown());

/** POST /api/resumes/build. `portfolio` is required (checked in the controller for the old message). */
export const buildBody = z.preprocess(
  orEmpty,
  z.looseObject({
    portfolio: z.unknown().optional(),
    targetRole: optionalText,
    country: optionalText,
    experienceLevel: optionalText,
    options: z.unknown().optional(),
  })
);

/** Missing -> "" (the enhance route always passed a string). */
const textOrEmpty = z.preprocess((value) => (value ? toText(value) : ""), z.string());

/** POST /api/resumes/enhance (multipart fields next to the file). */
export const enhanceBody = z.preprocess(
  orEmpty,
  z.looseObject({
    portfolio: jsonField,
    options: jsonField,
    targetRole: textOrEmpty,
    country: textOrEmpty,
  })
);

/** POST /api/resumes. */
export const saveBody = z.preprocess(
  orEmpty,
  z.looseObject({
    resume: z.unknown().optional(),
    title: optionalText,
    targetRole: optionalText,
    country: optionalText,
    status: optionalText,
  })
);

export const resumeIdParams = objectIdParams("Invalid resume id.");

/* ---------- Gemini output (build and enhance) ---------- */

// Matches the Resume model, so what we return can be saved as is.
// A number is accepted where text is expected (e.g. a year).
const aiText = z.union([z.string(), z.number()]).nullish();
const aiTextList = z.array(z.union([z.string(), z.number()])).nullish();
const aiList = <T extends z.ZodType>(item: T) => z.array(item).nullish();

const aiExperience = z.looseObject({
  id: aiText,
  company: aiText,
  position: aiText,
  location: aiText,
  startDate: aiText,
  endDate: aiText,
  bullets: aiTextList,
});

const aiEducation = z.looseObject({
  id: aiText,
  institution: aiText,
  degree: aiText,
  field: aiText,
  location: aiText,
  startDate: aiText,
  endDate: aiText,
  description: aiText,
});

const aiProject = z.looseObject({
  id: aiText,
  name: aiText,
  description: aiText,
  technologies: aiTextList,
  bullets: aiTextList,
});

const aiCertification = z.looseObject({
  id: aiText,
  name: aiText,
  issuer: aiText,
  year: aiText,
});

const hasText = (value: unknown) => typeof value === "string" && value.trim() !== "";

/**
 * What we accept from Gemini as a resume: a `content` object with the right
 * types, and at least a name, summary, job or skill (an empty resume is a
 * failed answer, not a draft).
 */
export const aiResume = z.looseObject({
  content: z
    .looseObject({
      name: aiText,
      title: aiText,
      email: aiText,
      phone: aiText,
      location: aiText,
      linkedin: aiText,
      github: aiText,
      website: aiText,
      summary: aiText,
      experience: aiList(aiExperience),
      education: aiList(aiEducation),
      skills: aiTextList,
      projects: aiList(aiProject),
      certifications: aiList(aiCertification),
    })
    .refine(
      (content) =>
        hasText(content.name) ||
        hasText(content.summary) ||
        Boolean(content.experience?.length) ||
        Boolean(content.skills?.length),
      { error: "The resume is empty." }
    ),
});

export type BuildBody = z.output<typeof buildBody>;
export type EnhanceBody = z.output<typeof enhanceBody>;
export type SaveBody = z.output<typeof saveBody>;
