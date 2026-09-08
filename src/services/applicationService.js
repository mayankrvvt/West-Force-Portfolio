export async function createApplication(
  jobId,
  candidateId
) {
  return {
    success: true,
    jobId,
    candidateId,
    status: "draft",
  };
}