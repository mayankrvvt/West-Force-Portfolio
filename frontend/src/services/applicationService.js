import { apiRequest } from "../utils/api";

export const APPLICATION_STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

/** GET /api/applications. Returns the list. */
export async function getApplications() {
  const result = await apiRequest("/api/applications");
  return result.applications || [];
}

/** Save a cached job to the user's applications (safe to call twice). Returns { application, created }. */
export async function saveJobApplication(job) {
  const result = await apiRequest("/api/applications", {
    method: "POST",
    body: JSON.stringify({ jobId: job._id || job.id }),
  });
  return { application: result.application, created: result.created !== false };
}

/** Add a manual application: { company, role, location?, url?, status?, notes? }. */
export async function createApplication(fields) {
  const result = await apiRequest("/api/applications", {
    method: "POST",
    body: JSON.stringify(fields),
  });
  return result.application;
}

export async function updateApplication(id, fields) {
  const result = await apiRequest(`/api/applications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  return result.application;
}

export async function updateApplicationStatus(id, status) {
  const result = await apiRequest(`/api/applications/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return result.application;
}

export async function deleteApplication(id) {
  await apiRequest(`/api/applications/${encodeURIComponent(id)}`, { method: "DELETE" });
}
