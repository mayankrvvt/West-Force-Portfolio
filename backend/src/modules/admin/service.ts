import { randomUUID } from "node:crypto";
import { AppError } from "../../lib/errors";
import { VALIDATION_ERROR } from "../../lib/validate";
import Job, { MANUAL_SOURCE, type JobDocument } from "../jobs/model";
import { SALARY_ORDER_MESSAGE, type CreateJobBody, type UpdateJobBody } from "./schema";

/** A manual job without a date sent hides this long after it is added. */
export const DEFAULT_EXPIRY_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const notFound = () => new AppError(404, "Job not found.");

/** Only jobs the admin added. Collected jobs are never shown or changed here. */
const manual = (id: string) => ({ _id: id, source: MANUAL_SOURCE });

/** Every manual job, hidden and expired ones too, newest first. */
export async function listManualJobs(): Promise<JobDocument[]> {
  return Job.find({ source: MANUAL_SOURCE }).sort({ createdAt: -1, _id: -1 });
}

export async function createManualJob(body: CreateJobBody, now = new Date()): Promise<JobDocument> {
  return Job.create({
    ...body,
    externalId: `${MANUAL_SOURCE}-${randomUUID()}`,
    source: MANUAL_SOURCE,
    postedAt: now,
    expiresAt: body.expiresAt === undefined ? new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * DAY_MS) : body.expiresAt,
  });
}

/**
 * When only one salary bound is sent, the stored other bound must not cross
 * it. Both sent: the schema already checked them. The check is part of the
 * update filter, so a write that lands in between cannot slip past it.
 */
function salaryBoundFilter(changes: Record<string, unknown>): Record<string, unknown> {
  const sentMin = "salaryMin" in changes;
  const sentMax = "salaryMax" in changes;
  if (sentMin === sentMax) return {};

  const value = sentMin ? changes.salaryMin : changes.salaryMax;
  if (value == null) return {};

  return sentMin
    ? { $or: [{ salaryMax: null }, { salaryMax: { $gte: value } }] }
    : { $or: [{ salaryMin: null }, { salaryMin: { $lte: value } }] };
}

/** Set only the sent fields. Salary order is checked against the stored values too. */
export async function updateManualJob(id: string, body: UpdateJobBody): Promise<JobDocument> {
  const changes = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
  const bound = salaryBoundFilter(changes);

  const job = await Job.findOneAndUpdate(
    { ...manual(id), ...bound },
    { $set: changes },
    { returnDocument: "after", runValidators: true }
  );

  if (job) return job;

  // No match: either the job is gone, or the salary bound failed.
  if (Object.keys(bound).length > 0 && (await Job.exists(manual(id)))) {
    throw new AppError(400, SALARY_ORDER_MESSAGE, { code: VALIDATION_ERROR });
  }

  throw notFound();
}

/**
 * Delete a manual job and return it. Applications keep their own copy of the
 * role, company, location and url, so a saved application still reads fine.
 */
export async function deleteManualJob(id: string): Promise<JobDocument> {
  const deleted = await Job.findOneAndDelete(manual(id));

  if (!deleted) throw notFound();

  return deleted;
}
