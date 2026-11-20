import type { Types } from "mongoose";
import { AppError } from "../../lib/errors";
import { isObjectId } from "../../lib/validate";
import { getJob } from "../jobs/service";
import { findOwner } from "../portfolios/service";
import Application, { type ApplicationDocument, type ApplicationStatus } from "./model";
import type { CreateApplicationBody, UpdateApplicationBody } from "./schema";

const notFound = () => new AppError(404, "Application not found.");

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 11000;
}

/** Moving past "Saved" with no date yet stamps appliedAt with now. */
function stampApplied(application: ApplicationDocument, status: ApplicationStatus | undefined) {
  if (status && status !== "Saved" && !application.appliedAt) {
    application.appliedAt = new Date();
  }
}

/** The signed-in user's own application, or 404 (also for other users' ids). */
async function findOwn(ownerId: Types.ObjectId, id: string): Promise<ApplicationDocument> {
  const application = isObjectId(id) ? await Application.findOne({ _id: id, ownerId }) : null;

  if (!application) throw notFound();

  return application;
}

export async function listApplications(
  firebaseUid: string,
  status?: ApplicationStatus
): Promise<ApplicationDocument[]> {
  const owner = await findOwner(firebaseUid);
  const filter = status ? { ownerId: owner._id, status } : { ownerId: owner._id };
  return Application.find(filter).sort({ updatedAt: -1 });
}

/**
 * Save an application. With a jobId it is idempotent: the same job again
 * returns the existing application (created: false) and changes nothing.
 */
export async function createApplication(
  firebaseUid: string,
  body: CreateApplicationBody
): Promise<{ application: ApplicationDocument; created: boolean }> {
  const owner = await findOwner(firebaseUid);
  const { jobId: rawJobId, ...fields } = body;

  if (!rawJobId) {
    const application = new Application({ ...fields, ownerId: owner._id });
    stampApplied(application, fields.status);
    await application.save();
    return { application, created: true };
  }

  // Only listed jobs (collected source, in Canada); anything else is a 404.
  const job = await getJob(rawJobId);

  const existing = await Application.findOne({ ownerId: owner._id, jobId: job._id });

  if (existing) return { application: existing, created: false };

  const application = new Application({
    ownerId: owner._id,
    jobId: job._id,
    company: job.company || "Unknown company",
    role: job.title,
    location: job.location,
    url: job.url,
    ...fields,
  });
  stampApplied(application, fields.status);

  try {
    await application.save();
    return { application, created: true };
  } catch (error) {
    // Two saves of the same job at once: the other one won, return it.
    if (!isDuplicateKey(error)) throw error;
    const winner = await Application.findOne({ ownerId: owner._id, jobId: job._id });
    if (!winner) throw error;
    return { application: winner, created: false };
  }
}

export async function updateApplication(
  firebaseUid: string,
  id: string,
  body: UpdateApplicationBody
): Promise<ApplicationDocument> {
  const owner = await findOwner(firebaseUid);
  const application = await findOwn(owner._id, id);

  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) application.set(key, value);
  }
  if (body.appliedAt === undefined) stampApplied(application, body.status);

  await application.save();
  return application;
}

export async function setApplicationStatus(
  firebaseUid: string,
  id: string,
  status: ApplicationStatus
): Promise<ApplicationDocument> {
  return updateApplication(firebaseUid, id, { status });
}

export async function deleteApplication(firebaseUid: string, id: string): Promise<void> {
  const owner = await findOwner(firebaseUid);
  const deleted = isObjectId(id)
    ? await Application.findOneAndDelete({ _id: id, ownerId: owner._id })
    : null;

  if (!deleted) throw notFound();
}
