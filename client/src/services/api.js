const API_URL = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

/*
|--------------------------------------------------------------------------
| API URL
|--------------------------------------------------------------------------
|
| Local development:
|   VITE_API_URL=http://localhost:5050
|
| Production:
|   VITE_API_URL=https://westforce-production.up.railway.app
|
*/

function buildUrl(endpoint) {
  const path = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${API_URL}${path}`;
}

/*
|--------------------------------------------------------------------------
| Generic API request
|--------------------------------------------------------------------------
*/

export async function apiRequest(
  endpoint,
  options = {}
) {
  const url = buildUrl(endpoint);

  const {
    method = "GET",
    headers = {},
    body,
    token,
    ...rest
  } = options;

  const requestHeaders = {
    ...headers,
  };

  /*
  |--------------------------------------------------------------------------
  | Authorization
  |--------------------------------------------------------------------------
  */

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  /*
  |--------------------------------------------------------------------------
  | JSON body
  |--------------------------------------------------------------------------
  */

  let requestBody = body;

  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData)
  ) {
    requestHeaders["Content-Type"] =
      requestHeaders["Content-Type"] ||
      "application/json";

    requestBody = JSON.stringify(body);
  }

  /*
  |--------------------------------------------------------------------------
  | Request
  |--------------------------------------------------------------------------
  */

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
    credentials: "include",
    ...rest,
  });

  /*
  |--------------------------------------------------------------------------
  | Parse response
  |--------------------------------------------------------------------------
  */

  const contentType =
    response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => "");

    data = text
      ? { message: text }
      : {};
  }

  /*
  |--------------------------------------------------------------------------
  | Error handling
  |--------------------------------------------------------------------------
  */

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );

    error.status = response.status;

    error.data = data;

    throw error;
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| File upload
|--------------------------------------------------------------------------
*/

export async function uploadFile(
  endpoint,
  file,
  options = {}
) {
  const url = buildUrl(endpoint);

  const {
    token,
    fieldName = "file",
    fields = {},
    method = "POST",
    headers = {},
  } = options;

  const formData = new FormData();

  /*
  |--------------------------------------------------------------------------
  | Add file
  |--------------------------------------------------------------------------
  */

  formData.append(
    fieldName,
    file
  );

  /*
  |--------------------------------------------------------------------------
  | Add additional fields
  |--------------------------------------------------------------------------
  */

  Object.entries(fields).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(
          key,
          String(value)
        );
      }
    }
  );

  const requestHeaders = {
    ...headers,
  };

  /*
  |--------------------------------------------------------------------------
  | Authorization
  |--------------------------------------------------------------------------
  */

  if (token) {
    requestHeaders.Authorization =
      `Bearer ${token}`;
  }

  /*
  |--------------------------------------------------------------------------
  | IMPORTANT:
  | Do NOT manually set Content-Type for FormData.
  | Browser adds multipart boundary automatically.
  |--------------------------------------------------------------------------
  */

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: formData,
    credentials: "include",
  });

  /*
  |--------------------------------------------------------------------------
  | Parse response
  |--------------------------------------------------------------------------
  */

  const contentType =
    response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => "");

    data = text
      ? { message: text }
      : {};
  }

  /*
  |--------------------------------------------------------------------------
  | Error handling
  |--------------------------------------------------------------------------
  */

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Upload failed with status ${response.status}`
    );

    error.status = response.status;

    error.data = data;

    throw error;
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Export API URL if another file needs it
|--------------------------------------------------------------------------
*/

export { API_URL };