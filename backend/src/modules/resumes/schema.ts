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

export type BuildBody = z.output<typeof buildBody>;
export type EnhanceBody = z.output<typeof enhanceBody>;
export type SaveBody = z.output<typeof saveBody>;
