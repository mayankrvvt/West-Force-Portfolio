import type { Request, Response } from "express";
import { failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { objectIdParams, parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { isAdmin, isOwner } from "../../middleware/requireAdmin";
import { settingsPatchBody } from "../site/schema";
import { dottedChanges, getSiteSettings, updateSiteSettings } from "../site/service";
import { listActivity, logActivity } from "./activity.service";
import { addAdmin, listAdmins, needsAdminVerification, removeAdmin } from "./admins.service";
import { activityQuery, addAdminBody, adminEmailParams, createJobBody, updateJobBody } from "./schema";
import { createManualJob, deleteManualJob, listManualJobs, updateManualJob } from "./service";

const jobIdParams = objectIdParams("Invalid job id.");

/** The signed-in admin's email, lower case (it is verified by requireAdmin). */
const actorEmail = (req: Request) => (currentUser(req).email ?? "").trim().toLowerCase();

/** GET /api/admin/me: any signed-in user; tells the UI whether to show admin pages. */
export async function getAdminStatus(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);

  const status = { isAdmin: await isAdmin(user), isOwner: isOwner(user) };

  // Only listed admins with an unverified email get the hint; others see no new key.
  if (!status.isAdmin && (await needsAdminVerification(user))) {
    ok(res, { ...status, needsVerification: true });
    return;
  }

  ok(res, status);
}

/** GET /api/admin/admins: any admin. */
export async function getAdmins(_req: Request, res: Response): Promise<void> {
  const admins = await failWith("Failed to load admins.", () => listAdmins());

  ok(res, { admins });
}

/** POST /api/admin/admins: owners only. */
export async function postAdmin(req: Request, res: Response): Promise<void> {
  const { email } = parse(addAdminBody, req.body);

  const admin = await failWith("Failed to add admin.", () => addAdmin(email, actorEmail(req)));

  await logActivity(req, "admin.add", email);
  ok(res, { admin }, 201);
}

/** DELETE /api/admin/admins/:email: owners only. Owners can't be removed. */
export async function deleteAdmin(req: Request, res: Response): Promise<void> {
  const { email } = parse(adminEmailParams, req.params);

  await failWith("Failed to remove admin.", () => removeAdmin(email));

  await logActivity(req, "admin.remove", email);
  ok(res, { message: "Admin removed." });
}

/** GET /api/admin/settings */
export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await failWith("Failed to load settings.", () => getSiteSettings());

  ok(res, { settings });
}

/** PATCH /api/admin/settings: only the sent fields change. */
export async function patchSettings(req: Request, res: Response): Promise<void> {
  const changes = dottedChanges(parse(settingsPatchBody, req.body));

  const settings = await failWith("Failed to save settings.", () => updateSiteSettings(changes, actorEmail(req)));

  await logActivity(req, "settings.update", "site", { changes });
  ok(res, { settings });
}

/** GET /api/admin/activity?page=1: newest first, 50 per page. */
export async function getActivity(req: Request, res: Response): Promise<void> {
  const { page } = parse(activityQuery, req.query);

  const { items, total } = await failWith("Failed to load activity.", () => listActivity(page));

  ok(res, { items, total });
}

/** GET /api/admin/jobs */
export async function listJobs(_req: Request, res: Response): Promise<void> {
  const jobs = await failWith("Failed to load jobs.", () => listManualJobs());

  ok(res, { jobs });
}

/** POST /api/admin/jobs */
export async function createJob(req: Request, res: Response): Promise<void> {
  const body = parse(createJobBody, req.body);

  const job = await failWith("Failed to add job.", () => createManualJob(body));

  req.log.info({ jobId: job._id }, "Admin added a job");
  await logActivity(req, "job.create", String(job._id), { title: job.title, company: job.company });
  ok(res, { job }, 201);
}

/** PATCH /api/admin/jobs/:id */
export async function updateJob(req: Request, res: Response): Promise<void> {
  const { id } = parse(jobIdParams, req.params);
  const body = parse(updateJobBody, req.body);

  const job = await failWith("Failed to update job.", () => updateManualJob(id, body));

  const fields = Object.keys(body).filter((key) => body[key as keyof typeof body] !== undefined);
  req.log.info({ jobId: job._id, fields }, "Admin updated a job");
  await logActivity(req, "job.update", id, { fields });
  ok(res, { job });
}

/** DELETE /api/admin/jobs/:id */
export async function deleteJob(req: Request, res: Response): Promise<void> {
  const { id } = parse(jobIdParams, req.params);

  const job = await failWith("Failed to delete job.", () => deleteManualJob(id));

  req.log.info({ jobId: id }, "Admin deleted a job");
  await logActivity(req, "job.delete", id, { title: job.title, company: job.company });
  ok(res, { message: "Job deleted." });
}
