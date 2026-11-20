import { z } from "zod";
import { DATE_ONLY, endOfDayInToronto } from "../../lib/dates";
import { isInCanada } from "../jobs/sources/canada";
import { htmlToText } from "../jobs/sources/common";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined || value === null ? {} : value);

const MAX_SALARY = 1_000_000;
const MAX_DESCRIPTION = 10_000;

const text = (label: string, min: number, max: number) =>
  z
    .string({ error: (issue) => (issue.input === undefined ? `${label} is required.` : `${label} must be text.`) })
    .trim()
    .min(min, { error: min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.` })
    .max(max, { error: `${label} must be at most ${max} characters.` });

const salary = (label: string) =>
  z
    .number({ error: `${label} must be a number.` })
    .int({ error: `${label} must be a whole number.` })
    .min(0, { error: `${label} cannot be negative.` })
    .max(MAX_SALARY, { error: `${label} must be at most ${MAX_SALARY.toLocaleString("en-CA")}.` })
    .nullable();

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const fields = {
  title: text("Title", 3, 150),
  company: text("Company", 1, 100),
  location: text("Location", 2, 100).refine(isInCanada, {
    error: "Location must be in Canada, for example \"Toronto, ON\".",
  }),
  type: text("Type", 0, 40),
  salaryMin: salary("Minimum salary"),
  salaryMax: salary("Maximum salary"),
  // Stored as plain text: tags and entities are stripped, line breaks kept.
  description: text("Description", 1, MAX_DESCRIPTION)
    .transform((value) => htmlToText(value, MAX_DESCRIPTION, { keepLines: true }))
    .pipe(z.string().min(1, { error: "Description is required." })),
  tags: z
    .array(text("Tag", 1, 30), { error: "Tags must be a list." })
    .max(10, { error: "Use at most 10 tags." }),
  url: text("URL", 1, 500).refine(isHttpsUrl, { error: "URL must start with https://." }),
  // A future date, or null for "never expires". A date with no time
  // ("2026-12-01") means the end of that day in Toronto, not UTC midnight.
  expiresAt: z
    .preprocess(
      (value) => (typeof value === "string" && DATE_ONLY.test(value.trim()) ? endOfDayInToronto(value.trim()) : value),
      z.coerce.date({ error: "Expiry date is not a valid date." })
    )
    .refine((date) => date.getTime() > Date.now(), { error: "Expiry date must be in the future." })
    .nullable(),
  hidden: z.boolean({ error: "Hidden must be true or false." }),
};

const strict = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Unknown field: ${issue.keys.join(", ")}.`
        : "Send the job as a JSON object.",
  });

const salaryInOrder = (body: { salaryMin?: number | null; salaryMax?: number | null }) =>
  body.salaryMin == null || body.salaryMax == null || body.salaryMin <= body.salaryMax;

export const SALARY_ORDER_MESSAGE = "Minimum salary cannot be more than maximum salary.";

/** POST /api/admin/jobs */
export const createJobBody = z.preprocess(
  orEmpty,
  strict({
    title: fields.title,
    company: fields.company,
    location: fields.location,
    type: fields.type.optional(),
    salaryMin: fields.salaryMin.optional(),
    salaryMax: fields.salaryMax.optional(),
    description: fields.description,
    tags: fields.tags.optional(),
    url: fields.url,
    expiresAt: fields.expiresAt.optional(),
    hidden: fields.hidden.optional(),
  }).refine(salaryInOrder, { error: SALARY_ORDER_MESSAGE, path: ["salaryMin"] })
);

/** PATCH /api/admin/jobs/:id: only the sent fields change. */
export const updateJobBody = z.preprocess(
  orEmpty,
  strict({
    title: fields.title.optional(),
    company: fields.company.optional(),
    location: fields.location.optional(),
    type: fields.type.optional(),
    salaryMin: fields.salaryMin.optional(),
    salaryMax: fields.salaryMax.optional(),
    description: fields.description.optional(),
    tags: fields.tags.optional(),
    url: fields.url.optional(),
    expiresAt: fields.expiresAt.optional(),
    hidden: fields.hidden.optional(),
  })
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      error: "Nothing to update.",
    })
    .refine(salaryInOrder, { error: SALARY_ORDER_MESSAGE, path: ["salaryMin"] })
);

const adminEmail = z
  .string({ error: (issue) => (issue.input === undefined ? "Email is required." : "Email must be text.") })
  .trim()
  .toLowerCase()
  .max(254, { error: "Email is too long." })
  .pipe(z.email({ error: "Enter a valid email address." }));

/** POST /api/admin/admins */
export const addAdminBody = z.preprocess(
  orEmpty,
  z.strictObject(
    { email: adminEmail },
    {
      error: (issue) =>
        issue.code === "unrecognized_keys" ? `Unknown field: ${issue.keys.join(", ")}.` : "Send the admin as a JSON object.",
    }
  )
);

/** DELETE /api/admin/admins/:email */
export const adminEmailParams = z.looseObject({ email: adminEmail });

/** GET /api/admin/activity?page=1 */
export const activityQuery = z.looseObject({
  page: z.preprocess(
    (value) => (value === undefined || value === "" ? 1 : value),
    z.coerce
      .number({ error: "Page must be a number." })
      .int({ error: "Page must be a whole number." })
      .min(1, { error: "Page must be 1 or more." })
      .max(10_000, { error: "Page is too large." })
  ),
});

export type CreateJobBody = z.output<typeof createJobBody>;
export type UpdateJobBody = z.output<typeof updateJobBody>;
