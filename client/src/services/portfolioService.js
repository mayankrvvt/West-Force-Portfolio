// client/src/services/portfolioService.js

export async function getPortfolio(slug) {
  if (!slug) {
    throw new Error("Portfolio slug is required.");
  }

  const response = await fetch(
    `/api/portfolios/${encodeURIComponent(slug)}`
  );

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to load portfolio."
    );
  }

  return (
    result.portfolio ||
    result.data ||
    result
  );
}

export default getPortfolio;