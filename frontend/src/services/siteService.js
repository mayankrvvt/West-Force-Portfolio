import { publicApiRequest } from "../utils/api";

/** GET /api/site/status. Public: maintenance, banner and feature switches. */
export async function getSiteStatus() {
  const result = await publicApiRequest("/api/site/status");
  return {
    maintenance: result.maintenance || {},
    banner: result.banner || {},
    features: result.features || {},
  };
}
