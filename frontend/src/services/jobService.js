import { apiRequest } from "../utils/api";

/** GET /api/jobs. Returns { jobs, total, page, limit, cached }. */
export async function searchJobs({ query = "", location = "", page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("query", query.trim());
  if (location.trim()) params.set("location", location.trim());
  params.set("page", String(page));
  params.set("limit", String(limit));
  return apiRequest(`/api/jobs?${params.toString()}`);
}

/** GET /api/jobs/for-me. The best jobs for the user, each with score and reasons. */
export async function getJobsForMe() {
  const result = await apiRequest("/api/jobs/for-me");
  return result.jobs || [];
}

/** POST /api/jobs/:id/hide. "Not interested": jobs for you stops showing it. */
export async function hideJob(id) {
  await apiRequest(`/api/jobs/${encodeURIComponent(id)}/hide`, { method: "POST" });
}

/** DELETE /api/jobs/:id/hide. Undo "Not interested". */
export async function unhideJob(id) {
  await apiRequest(`/api/jobs/${encodeURIComponent(id)}/hide`, { method: "DELETE" });
}

/** GET /api/users/me/job-preferences. Returns { titles, city, province, remoteOk }. */
export async function getJobPreferences() {
  const result = await apiRequest("/api/users/me/job-preferences");
  return result.jobPreferences || {};
}

/** PUT /api/users/me/job-preferences. Only the fields sent are changed. */
export async function saveJobPreferences(preferences) {
  const result = await apiRequest("/api/users/me/job-preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
  return result.jobPreferences || {};
}

/** Canadian provinces and territories, for the job preferences form. */
export const PROVINCES = [
  ["AB", "Alberta"],
  ["BC", "British Columbia"],
  ["MB", "Manitoba"],
  ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"],
  ["NS", "Nova Scotia"],
  ["NT", "Northwest Territories"],
  ["NU", "Nunavut"],
  ["ON", "Ontario"],
  ["PE", "Prince Edward Island"],
  ["QC", "Quebec"],
  ["SK", "Saskatchewan"],
  ["YT", "Yukon"],
];

/** GET /api/jobs/:id. Returns { job }. */
export async function getJob(id) {
  const result = await apiRequest(`/api/jobs/${encodeURIComponent(id)}`);
  return result.job;
}

/** Show salary as "$60,000 - $90,000" (or one side, or nothing). */
export function formatSalary(job) {
  const money = (value) => `$${Math.round(value).toLocaleString("en-CA")}`;
  if (job?.salaryMin && job?.salaryMax && job.salaryMin !== job.salaryMax) {
    return `${money(job.salaryMin)} - ${money(job.salaryMax)}`;
  }
  const one = job?.salaryMin || job?.salaryMax;
  return one ? money(one) : "";
}
