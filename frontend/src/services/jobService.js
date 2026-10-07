import { getMockJobs, saveMockApplication } from "./mockApi";

export { getMockJobs, saveMockApplication };

export async function getRecommendedJobs(filters = {}) {
  return getMockJobs(filters);
}
