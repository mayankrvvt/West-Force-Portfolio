import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

/*
|--------------------------------------------------------------------------
| API configuration
|--------------------------------------------------------------------------
|
| With the Vercel reverse proxy, keep API calls relative:
|
|   /api/users
|   /api/portfolios
|   /api/uploads
|   /api/chat
|
| Vercel forwards /api/* to Render.
|
| For local development, Vite proxies /api to localhost:5050.
|
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "";

/*
|--------------------------------------------------------------------------
| Build API URL
|--------------------------------------------------------------------------
*/

function buildApiUrl(endpoint) {
  if (!endpoint) {
    throw new Error("API endpoint is required.");
  }

  /*
  |--------------------------------------------------------------------------
  | Already an absolute URL
  |--------------------------------------------------------------------------
  */

  if (
    endpoint.startsWith("http://") ||
    endpoint.startsWith("https://")
  ) {
    return endpoint;
  }

  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${normalizedBase}${normalizedEndpoint}`;
}

/*
|--------------------------------------------------------------------------
| Wait for Firebase authentication state
|--------------------------------------------------------------------------
*/

export function waitForAuthUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

/*
|--------------------------------------------------------------------------
| Get authenticated Firebase user
|--------------------------------------------------------------------------
*/

async function getAuthenticatedUser() {
  /*
  |--------------------------------------------------------------------------
  | Firebase authStateReady
  |--------------------------------------------------------------------------
  */

  if (
    typeof auth.authStateReady === "function"
  ) {
    await auth.authStateReady();
  } else {
    await waitForAuthUser();
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be signed in."
    );
  }

  return user;
}

/*
|--------------------------------------------------------------------------
| Get Firebase ID token
|--------------------------------------------------------------------------
*/

export async function getFirebaseIdToken(
  forceRefresh = false
) {
  const user =
    await getAuthenticatedUser();

  /*
  |--------------------------------------------------------------------------
  | Get a fresh Firebase ID token
  |--------------------------------------------------------------------------
  */

  const token =
    await user.getIdToken(forceRefresh);

  if (!token) {
    throw new Error(
      "Unable to obtain Firebase authentication token."
    );
  }

  return token;
}

/*
|--------------------------------------------------------------------------
| Get authentication headers
|--------------------------------------------------------------------------
*/

export async function getAuthHeaders() {
  const token =
    await getFirebaseIdToken(false);

  return {
    Authorization: `Bearer ${token}`,
  };
}

/*
|--------------------------------------------------------------------------
| Standard API request
|--------------------------------------------------------------------------
*/

export async function apiRequest(
  endpoint,
  options = {}
) {
  const url = buildApiUrl(endpoint);

  /*
  |--------------------------------------------------------------------------
  | Get Firebase token
  |--------------------------------------------------------------------------
  */

  const tokenHeaders =
    await getAuthHeaders();

  /*
  |--------------------------------------------------------------------------
  | Build headers
  |--------------------------------------------------------------------------
  */

  const requestHeaders = {
    ...(options.headers || {}),
    ...tokenHeaders,
  };

  /*
  |--------------------------------------------------------------------------
  | Automatically add JSON content type
  |--------------------------------------------------------------------------
  */

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    requestHeaders["Content-Type"] =
      requestHeaders["Content-Type"] ||
      "application/json";
  }

  /*
  |--------------------------------------------------------------------------
  | Request
  |--------------------------------------------------------------------------
  */

  console.log(
    `[API] ${options.method || "GET"} ${url}`
  );

  console.log(
    "[API] Firebase Authorization header:",
    Boolean(requestHeaders.Authorization)
  );

  const response = await fetch(url, {
    ...options,

    method:
      options.method || "GET",

    headers: requestHeaders,

    /*
    |--------------------------------------------------------------------------
    | Required for credentialed cross-origin requests
    |--------------------------------------------------------------------------
    */

    credentials: "include",
  });

  /*
  |--------------------------------------------------------------------------
  | Parse response
  |--------------------------------------------------------------------------
  */

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let result = {};

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      result = await response.json();
    } catch (error) {
      console.error(
        "Failed to parse JSON response:",
        error
      );

      throw new Error(
        `Server returned invalid JSON (${response.status}).`
      );
    }
  } else {
    const rawText =
      await response.text();

    console.error(
      "Server returned a non-JSON response:",
      {
        status: response.status,
        statusText:
          response.statusText,
        contentType,
        body: rawText.slice(
          0,
          1000
        ),
      }
    );

    throw new Error(
      `Server returned a non-JSON response (${response.status}).`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Handle HTTP errors
  |--------------------------------------------------------------------------
  */

  if (!response.ok) {
    const error = new Error(
      result?.message ||
        result?.error ||
        `API request failed (${response.status}).`
    );

    error.status =
      response.status;

    error.data = result;

    throw error;
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| Upload file
|--------------------------------------------------------------------------
*/

export async function uploadFile(
  endpoint,
  file,
  options = {}
) {
  if (!file) {
    throw new Error(
      "A file is required."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Firebase authentication
  |--------------------------------------------------------------------------
  */

  const tokenHeaders =
    await getAuthHeaders();

  /*
  |--------------------------------------------------------------------------
  | FormData
  |--------------------------------------------------------------------------
  */

  const formData =
    new FormData();

  formData.append(
    options.fieldName || "file",
    file
  );

  /*
  |--------------------------------------------------------------------------
  | Additional form fields
  |--------------------------------------------------------------------------
  */

  if (options.fields) {
    Object.entries(
      options.fields
    ).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null
        ) {
          formData.append(
            key,
            String(value)
          );
        }
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Upload
  |--------------------------------------------------------------------------
  */

  const response = await fetch(
    buildApiUrl(endpoint),
    {
      method:
        options.method || "POST",

      headers: {
        ...tokenHeaders,
        ...(options.headers || {}),
      },

      /*
      |--------------------------------------------------------------------------
      | DO NOT manually set Content-Type.
      |
      | Browser automatically creates:
      | multipart/form-data; boundary=...
      |--------------------------------------------------------------------------
      */

      body: formData,

      credentials: "include",
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Parse response
  |--------------------------------------------------------------------------
  */

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let result = {};

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      result =
        await response.json();
    } catch {
      throw new Error(
        `Upload server returned invalid JSON (${response.status}).`
      );
    }
  } else {
    const rawText =
      await response.text();

    console.error(
      "Upload server returned non-JSON response:",
      rawText.slice(
        0,
        1000
      )
    );

    throw new Error(
      `Upload server returned a non-JSON response (${response.status}).`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Handle errors
  |--------------------------------------------------------------------------
  */

  if (!response.ok) {
    const error = new Error(
      result?.message ||
        result?.error ||
        `File upload failed (${response.status}).`
    );

    error.status =
      response.status;

    error.data = result;

    throw error;
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| Public API request
|--------------------------------------------------------------------------
|
| Useful for public endpoints that do NOT require Firebase authentication.
|
*/

export async function publicApiRequest(
  endpoint,
  options = {}
) {
  const response = await fetch(
    buildApiUrl(endpoint),
    {
      ...options,

      credentials: "include",
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let result = {};

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    result =
      await response.json().catch(
        () => ({})
      );
  } else {
    const text =
      await response.text();

    result = {
      message: text,
    };
  }

  if (!response.ok) {
    const error = new Error(
      result?.message ||
        result?.error ||
        `API request failed (${response.status}).`
    );

    error.status =
      response.status;

    error.data = result;

    throw error;
  }

  return result;
}

export {
  API_BASE_URL,
  buildApiUrl,
};