import {
  apiRequest,
  publicApiRequest,
} from "../utils/api";

/*
|--------------------------------------------------------------------------
| Get public portfolio by slug
|--------------------------------------------------------------------------
|
| This endpoint does NOT require Firebase authentication.
|
| Example:
|
| /api/portfolios/mavenzod
|
*/

export async function getPortfolio(
  slug
) {
  if (!slug) {
    throw new Error(
      "Portfolio slug is required."
    );
  }

  const result =
    await publicApiRequest(
      `/api/portfolios/${encodeURIComponent(
        slug
      )}`
    );

  return (
    result?.portfolio ||
    result?.data ||
    result
  );
}

/*
|--------------------------------------------------------------------------
| Get current user's private portfolio
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This uses apiRequest(), which automatically adds:
|
| Authorization: Bearer <Firebase ID Token>
|
*/

export async function getMyPortfolio() {
  const result =
    await apiRequest(
      "/api/portfolios/me",
      {
        method: "GET",
      }
    );

  return (
    result?.portfolio ||
    result?.data ||
    result
  );
}

/*
|--------------------------------------------------------------------------
| Create portfolio
|--------------------------------------------------------------------------
*/

export async function createPortfolio(
  portfolioData
) {
  const result =
    await apiRequest(
      "/api/portfolios",
      {
        method: "POST",

        body: JSON.stringify(
          portfolioData
        ),
      }
    );

  return (
    result?.portfolio ||
    result?.data ||
    result
  );
}

/*
|--------------------------------------------------------------------------
| Update current user's portfolio
|--------------------------------------------------------------------------
*/

export async function updateMyPortfolio(
  portfolioData
) {
  const result =
    await apiRequest(
      "/api/portfolios/me",
      {
        method: "PUT",

        body: JSON.stringify(
          portfolioData
        ),
      }
    );

  return (
    result?.portfolio ||
    result?.data ||
    result
  );
}

/*
|--------------------------------------------------------------------------
| Delete current user's portfolio
|--------------------------------------------------------------------------
*/

export async function deleteMyPortfolio() {
  return apiRequest(
    "/api/portfolios/me",
    {
      method: "DELETE",
    }
  );
}

/*
|--------------------------------------------------------------------------
| Update document protection
|--------------------------------------------------------------------------
*/

export async function updateDocumentProtection(
  enabled,
  pin = ""
) {
  const result =
    await apiRequest(
      "/api/portfolios/me/document-protection",
      {
        method: "PUT",

        body: JSON.stringify({
          enabled,
          ...(enabled
            ? { pin }
            : {}),
        }),
      }
    );

  return (
    result?.documentProtection ||
    result
  );
}

export default getPortfolio;