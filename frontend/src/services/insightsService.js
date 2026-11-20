import { apiRequest, getAuthHeaders, publicApiRequest } from "../utils/api";

/** The signed-in owner's portfolio views, unlocks and document opens. */
export function getMyInsights(days = 30) {
  return apiRequest(`/api/insights/me?days=${encodeURIComponent(days)}`);
}

/**
 * Tell the server someone opened a public portfolio. Sends the owner's token
 * when signed in so their own visits are not counted. Never throws.
 */
export async function sendPortfolioView(slug) {
  if (!slug) return;

  try {
    // Not signed in: getAuthHeaders throws, and the view is sent without a token.
    const headers = await getAuthHeaders().catch(() => ({}));

    await publicApiRequest(`/api/insights/portfolios/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      headers,
      keepalive: true,
    });
  } catch {
    /* Views are best effort: a failed beacon never affects the page. */
  }
}
