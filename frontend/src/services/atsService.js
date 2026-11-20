import { apiRequest, uploadFile } from "../utils/api";

/** Read the text out of an uploaded resume file. Returns { resumeText, fileName }. */
export async function extractResumeText(file) {
  const result = await uploadFile("/api/resumes/extract-text", file);
  return { resumeText: result?.resumeText?.trim() || "", fileName: result?.fileName || file.name };
}

/**
 * POST /api/ats/check. Send { resumeText } or { resumeId }, plus jobDescription
 * and an optional jobTitle. Returns { checkId, score, breakdown, keywords, advice, ... }.
 */
export async function runAtsCheck({ resumeText, resumeId, jobDescription, jobTitle }) {
  const body = resumeText ? { resumeText, jobDescription } : { resumeId, jobDescription };
  if (jobTitle?.trim()) body.jobTitle = jobTitle.trim();
  return apiRequest("/api/ats/check", { method: "POST", body: JSON.stringify(body) });
}

/** GET /api/ats/history. Your own past checks, newest first. */
export async function getAtsHistory({ resumeId, limit = 20 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (resumeId) params.set("resumeId", resumeId);
  const result = await apiRequest(`/api/ats/history?${params}`);
  return result.checks || [];
}
