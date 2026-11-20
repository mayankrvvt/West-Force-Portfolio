import { apiRequest } from "../utils/api";

// Same envelope as GET /api/jobs/:id: { success: true, job } on success,
// { success: false, message } with 400, 403 or 404 on error (apiRequest throws
// an Error carrying that message).

/** GET /api/admin/me. Returns { isAdmin, isOwner } for the signed-in user. */
export async function getAdminStatus() {
  const result = await apiRequest("/api/admin/me");
  return { isAdmin: result?.isAdmin === true, isOwner: result?.isOwner === true };
}

/** GET /api/admin/admins. Owners come first. */
export async function listAdmins() {
  const result = await apiRequest("/api/admin/admins");
  return result.admins || [];
}

/** POST /api/admin/admins. Owners only. Returns the new admin. */
export async function addAdmin(email) {
  const result = await apiRequest("/api/admin/admins", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return result.admin;
}

/** DELETE /api/admin/admins/:email. Owners only; owners can't be removed. */
export async function removeAdmin(email) {
  await apiRequest(`/api/admin/admins/${encodeURIComponent(email)}`, { method: "DELETE" });
}

/** GET /api/admin/settings */
export async function getSettings() {
  const result = await apiRequest("/api/admin/settings");
  return result.settings;
}

/** PATCH /api/admin/settings. Send only the changed nested fields. */
export async function updateSettings(changes) {
  const result = await apiRequest("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  return result.settings;
}

/** GET /api/admin/activity?page=N. 50 per page, newest first. */
export async function listActivity(page = 1) {
  const result = await apiRequest(`/api/admin/activity?page=${encodeURIComponent(page)}`);
  return { items: result.items || [], total: result.total || 0 };
}

/** GET /api/admin/jobs. Manual jobs, hidden and expired ones included. */
export async function listAdminJobs() {
  const result = await apiRequest("/api/admin/jobs");
  return result.jobs || [];
}

/** POST /api/admin/jobs. Returns the new job. */
export async function createJob(fields) {
  const result = await apiRequest("/api/admin/jobs", {
    method: "POST",
    body: JSON.stringify(fields),
  });
  return result.job;
}

/** PATCH /api/admin/jobs/:id. Send only the fields that changed. Returns the job. */
export async function updateJob(id, changes) {
  const result = await apiRequest(`/api/admin/jobs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  return result.job;
}

/** DELETE /api/admin/jobs/:id. Returns the server's message. */
export async function deleteJob(id) {
  const result = await apiRequest(`/api/admin/jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return result.message || "";
}
