import { z } from "zod";
import { PROVINCE_CODE_LIST } from "../jobs/sources/canada";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined ? {} : value);

const optionalText = z.string().nullish();

/** POST /api/users — every field is optional; missing ones fall back to the Firebase token. */
export const createUserBody = z.preprocess(
  orEmpty,
  z.looseObject({
    email: optionalText,
    displayName: optionalText,
    photoURL: optionalText,
  })
);

/** PUT /api/users/me — only the fields that are sent are changed. */
export const updateUserBody = z.preprocess(
  orEmpty,
  z.looseObject({
    displayName: optionalText,
    photoURL: optionalText,
  })
);

const jobTitle = z
  .string({ error: "Each job title must be text." })
  .trim()
  .min(1, { error: "Job titles cannot be empty." })
  .max(80, { error: "Each job title must be at most 80 characters." });

/** PUT /api/users/me/job-preferences — only the fields that are sent are changed. */
export const jobPreferencesBody = z.preprocess(
  orEmpty,
  z.object({
    titles: z
      .array(jobTitle, { error: "Job titles must be a list." })
      .max(5, { error: "Add at most 5 job titles." })
      // Drop repeats that differ only in case.
      .transform((titles) =>
        titles.filter(
          (title, i) => titles.findIndex((t) => t.toLowerCase() === title.toLowerCase()) === i
        )
      )
      .optional(),
    city: z
      .string({ error: "City must be text." })
      .trim()
      .max(80, { error: "City must be at most 80 characters." })
      .optional(),
    // Two letter code, or "" to clear it.
    province: z
      .enum(["", ...PROVINCE_CODE_LIST], { error: "Choose a Canadian province or territory." })
      .optional(),
    remoteOk: z.boolean({ error: "remoteOk must be true or false." }).optional(),
    weeklyEmail: z.boolean({ error: "weeklyEmail must be true or false." }).optional(),
  })
);

export type CreateUserBody = z.output<typeof createUserBody>;
export type JobPreferencesBody = z.output<typeof jobPreferencesBody>;
export type UpdateUserBody = z.output<typeof updateUserBody>;
