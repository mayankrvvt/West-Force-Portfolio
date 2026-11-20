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

/** GET /api/jobs/:id. Returns { job }. */
export async function getJob(id) {
  const result = await apiRequest(`/api/jobs/${encodeURIComponent(id)}`);
  return result.job;
}

/** True when the server has no job source set up yet. */
export function isJobsNotConfigured(error) {
  return error?.data?.code === "JOBS_NOT_CONFIGURED";
}

/** Show salary as "₹6,00,000 - ₹9,00,000" (or one side, or nothing). */
export function formatSalary(job) {
  const money = (value) => `₹${Math.round(value).toLocaleString("en-IN")}`;
  if (job?.salaryMin && job?.salaryMax && job.salaryMin !== job.salaryMax) {
    return `${money(job.salaryMin)} - ${money(job.salaryMax)}`;
  }
  const one = job?.salaryMin || job?.salaryMax;
  return one ? money(one) : "";
}
