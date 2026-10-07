import { getMockApplications, saveMockApplication, updateMockApplicationStatus } from "./mockApi";

export { getMockApplications, saveMockApplication, updateMockApplicationStatus };

export async function createApplication(job, candidateId = "demo-candidate") {
  const application = await saveMockApplication(job);
  return { success: true, candidateId, ...application };
}
