import { z } from "zod";
import { APPLICATION_STATUSES } from "./model";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined || value === null ? {} : value);

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} must be text.` })
    .trim()
    .max(max, { error: `${label} is too long.` });

const url = z
  .string({ error: "URL must be text." })
  .trim()
  .max(2000, { error: "URL is too long." })
  .refine((value) => value === "" || /^https?:\/\//i.test(value), {
    error: "URL must start with http:// or https://.",
  });

const status = z.enum(APPLICATION_STATUSES, {
  error: `Status must be one of: ${APPLICATION_STATUSES.join(", ")}.`,
});

/** ISO date string, or null to clear it. */
const appliedAt = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.date({ error: "Applied date is not a valid date." }).nullable()
);

const fields = {
  company: text("Company", 200),
  role: text("Role", 200),
  location: text("Location", 200),
  url,
  status,
  appliedAt,
  notes: text("Notes", 5000),
};

/**
 * POST /api/applications: either { jobId } (details come from the cached job,
 * fields sent here win) or a manual entry with company and role.
 */
export const createApplicationBody = z.preprocess(
  orEmpty,
  z
    .object({
      jobId: z.string({ error: "Job id must be text." }).trim().optional(),
      company: fields.company.optional(),
      role: fields.role.optional(),
      location: fields.location.optional(),
      url: fields.url.optional(),
      status: fields.status.optional(),
      appliedAt: fields.appliedAt.optional(),
      notes: fields.notes.optional(),
    })
    .refine((body) => body.jobId || (body.company && body.role), {
      error: "Company and role are required.",
    })
);

/** PATCH /api/applications/:id: only the sent fields change. */
export const updateApplicationBody = z.preprocess(
  orEmpty,
  z
    .object({
      company: fields.company.min(1, { error: "Company cannot be empty." }).optional(),
      role: fields.role.min(1, { error: "Role cannot be empty." }).optional(),
      location: fields.location.optional(),
      url: fields.url.optional(),
      status: fields.status.optional(),
      appliedAt: fields.appliedAt.optional(),
      notes: fields.notes.optional(),
    })
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      error: "Nothing to update.",
    })
);

/** PATCH /api/applications/:id/status */
export const statusBody = z.preprocess(orEmpty, z.object({ status }));

/** GET /api/applications?status=Interview */
export const listApplicationsQuery = z.looseObject({
  status: z.preprocess((value) => (value === "" ? undefined : value), status.optional()),
});

export type CreateApplicationBody = z.output<typeof createApplicationBody>;
export type UpdateApplicationBody = z.output<typeof updateApplicationBody>;
