import { apiRequest } from "../utils/api";

/** GET /api/resumes. Returns the list. */
export async function getSavedResumes() {
  const result = await apiRequest("/api/resumes");
  return result.resumes || [];
}

/**
 * POST /api/resumes/tailor with { resumeId, jobDescription, jobTitle?, company?, jobId? }.
 * Returns { original, tailored, changes, addedKeywords, skippedKeywords }.
 */
export async function tailorResume({ resumeId, jobDescription, jobTitle, company, jobId }) {
  return apiRequest("/api/resumes/tailor", {
    method: "POST",
    body: JSON.stringify({ resumeId, jobDescription, jobTitle, company, jobId }),
  });
}

/** POST /api/resumes/tailor/save. Returns the new resume. */
export async function saveTailoredResume({ sourceResumeId, tailored, jobTitle, company, jobId }) {
  const result = await apiRequest("/api/resumes/tailor/save", {
    method: "POST",
    body: JSON.stringify({ sourceResumeId, tailored, jobTitle, company, jobId }),
  });
  return result.resume;
}

/** The error code the server sent with a failed call, if any. */
export function errorCode(error) {
  return error?.data?.code || error?.code || "";
}
