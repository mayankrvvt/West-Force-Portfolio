import { DEMO_MODE, getDemoSessionUser } from "../demo/demoMode";

// Firebase loads in its own chunk, so it stays out of the main bundle.
// Remember it once loaded, so public requests can add a token without
// waiting for (or starting) the Firebase load. useAuth loads it through here.
let loadedFirebase = null;
export const loadFirebase = () =>
  import("../firebase/firebase").then((firebase) => {
    loadedFirebase = firebase;
    return firebase;
  });

// Local-dev-only demo mode: answer from sample data, never Firebase or fetch.
// DEMO_MODE is false in production builds, so this import is dropped there.
const loadDemoApi = () => import("../demo/demoApi");

/**
 * ======================================================
 * API CONFIGURATION
 * ======================================================
 *
 * Production:
 *
 * Vercel
 *   ↓
 * /api/*
 *   ↓
 * Vercel rewrite
 *   ↓
 * Render
 *
 * Local:
 *
 * Vite
 *   ↓
 * /api/*
 *   ↓
 * localhost:5050
 *
 * We intentionally keep API_BASE_URL empty by default.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "";

/**
 * Fired on window when the server says the site is shut down
 * (503 with code MAINTENANCE). The site status provider listens for it.
 */
export const MAINTENANCE_EVENT = "westforce:maintenance";

/** Error with the server's message, plus .status, .code and .data. */
function apiError(message, status, result) {
  const error = new Error(message);
  error.status = status;
  error.code = result?.code || "";
  error.data = result;

  if (status === 503 && error.code === "MAINTENANCE") {
    window.dispatchEvent(
      new CustomEvent(MAINTENANCE_EVENT, { detail: { message } })
    );
  }

  return error;
}

/**
 * ======================================================
 * BUILD API URL
 * ======================================================
 */

function buildApiUrl(endpoint) {
  if (!endpoint) {
    throw new Error(
      "API endpoint is required."
    );
  }

  /**
   * Absolute URL
   */

  if (
    endpoint.startsWith("http://") ||
    endpoint.startsWith("https://")
  ) {
    return endpoint;
  }

  const normalizedBase =
    API_BASE_URL.replace(
      /\/+$/,
      ""
    );

  const normalizedEndpoint =
    endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;

  return `${normalizedBase}${normalizedEndpoint}`;
}

/**
 * ======================================================
 * WAIT FOR FIREBASE AUTH
 * ======================================================
 */

export async function waitForAuthUser() {
  if (DEMO_MODE) {
    return getDemoSessionUser();
  }

  const { auth, onAuthStateChanged } = await loadFirebase();

  return new Promise(
    (resolve, reject) => {
      const unsubscribe =
        onAuthStateChanged(
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
    }
  );
}

/**
 * ======================================================
 * GET AUTHENTICATED USER
 * ======================================================
 */

async function getAuthenticatedUser() {
  const { auth } = await loadFirebase();

  if (
    typeof auth.authStateReady ===
    "function"
  ) {
    await auth.authStateReady();
  } else {
    await waitForAuthUser();
  }

  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be signed in."
    );
  }

  return user;
}

/**
 * ======================================================
 * GET FIREBASE ID TOKEN
 * ======================================================
 */

export async function getFirebaseIdToken(
  forceRefresh = false
) {
  if (DEMO_MODE) {
    return "demo-token";
  }

  const user =
    await getAuthenticatedUser();

  const token =
    await user.getIdToken(
      forceRefresh
    );

  if (!token) {
    throw new Error(
      "Unable to obtain Firebase authentication token."
    );
  }

  return token;
}

/**
 * ======================================================
 * AUTH HEADERS
 * ======================================================
 */

export async function getAuthHeaders() {
  if (DEMO_MODE) {
    return { Authorization: "Bearer demo-token" };
  }

  const token =
    await getFirebaseIdToken(false);

  return {
    Authorization:
      `Bearer ${token}`,
  };
}

/**
 * ======================================================
 * STANDARD API REQUEST
 * ======================================================
 */

export async function apiRequest(
  endpoint,
  options = {}
) {
  if (DEMO_MODE) {
    return (await loadDemoApi()).demoRequest(endpoint, options);
  }

  const url =
    buildApiUrl(endpoint);

  const tokenHeaders =
    await getAuthHeaders();

  const requestHeaders = {
    ...(options.headers || {}),
    ...tokenHeaders,
  };

  /**
   * Add JSON content type automatically.
   *
   * Do NOT add it for FormData.
   */

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    requestHeaders[
      "Content-Type"
    ] =
      requestHeaders[
        "Content-Type"
      ] ||
      "application/json";
  }



  const response =
    await fetch(url, {
      ...options,

      method:
        options.method || "GET",

      headers:
        requestHeaders,

      credentials:
        "include",
    });

  /**
   * ====================================================
   * PARSE RESPONSE
   * ====================================================
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
    } catch (error) {
      console.error(
        "Failed to parse JSON:",
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
      "Non-JSON server response:",
      {
        status:
          response.status,

        statusText:
          response.statusText,

        contentType,

        body:
          rawText.slice(
            0,
            1000
          ),
      }
    );

    throw new Error(
      `Server returned a non-JSON response (${response.status}).`
    );
  }

  /**
   * ====================================================
   * HTTP ERROR
   * ====================================================
   */

  if (!response.ok) {
    throw apiError(
      result?.message ||
        result?.error ||
        `API request failed (${response.status}).`,
      response.status,
      result
    );
  }

  return result;
}

/**
 * ======================================================
 * UPLOAD FILE
 * ======================================================
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

  if (DEMO_MODE) {
    return (await loadDemoApi()).demoUpload(endpoint, file, options);
  }

  /**
   * ----------------------------------------------------
   * Firebase authentication
   * ----------------------------------------------------
   */

  const tokenHeaders =
    await getAuthHeaders();

  /**
   * ----------------------------------------------------
   * FormData
   * ----------------------------------------------------
   */

  const formData =
    new FormData();

  formData.append(
    options.fieldName ||
      "file",

    file
  );

  /**
   * ----------------------------------------------------
   * Additional fields
   * ----------------------------------------------------
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

  /**
   * ----------------------------------------------------
   * Request
   * ----------------------------------------------------
   */

  const url =
    buildApiUrl(endpoint);


  const response =
    await fetch(url, {
      method:
        options.method || "POST",

      headers: {
        ...tokenHeaders,

        ...(options.headers || {}),
      },

      /**
       * IMPORTANT:
       *
       * Never manually set:
       *
       * Content-Type:
       * multipart/form-data
       *
       * The browser must generate
       * the boundary automatically.
       */

      body: formData,

      credentials:
        "include",
    });

  /**
   * ====================================================
   * PARSE RESPONSE
   * ====================================================
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
    } catch (error) {
      console.error(
        "Failed to parse upload response:",
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
      "Upload returned non-JSON:",
      {
        status:
          response.status,

        statusText:
          response.statusText,

        contentType,

        body:
          rawText.slice(
            0,
            1000
          ),
      }
    );

    throw new Error(
      `Server returned a non-JSON response (${response.status}).`
    );
  }

  /**
   * ====================================================
   * HANDLE ERROR
   * ====================================================
   */

  if (!response.ok) {
    throw apiError(
      result?.message ||
        result?.error ||
        `File upload failed (${response.status}).`,
      response.status,
      result
    );
  }

  return result;
}

/**
 * ======================================================
 * PUBLIC API REQUEST
 * ======================================================
 */

export async function publicApiRequest(
  endpoint,
  options = {}
) {
  if (DEMO_MODE) {
    return (await loadDemoApi()).demoRequest(endpoint, options);
  }

  // A signed-in admin must get past maintenance on public pages too, so send
  // the token when there is a user. Guests never wait for Firebase.
  let tokenHeaders = {};

  if (loadedFirebase?.auth?.currentUser) {
    try {
      tokenHeaders =
        await getAuthHeaders();
    } catch {
      tokenHeaders = {};
    }
  }

  const response =
    await fetch(
      buildApiUrl(endpoint),
      {
        ...options,

        headers: {
          ...(options.headers || {}),
          ...tokenHeaders,
        },

        credentials:
          "include",
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
      await response.json()
        .catch(() => ({}));
  } else {
    const text =
      await response.text();

    result = {
      message: text,
    };
  }

  if (!response.ok) {
    throw apiError(
      result?.message ||
        result?.error ||
        `API request failed (${response.status}).`,
      response.status,
      result
    );
  }

  return result;
}

/**
 * ======================================================
 * EXPORTS
 * ======================================================
 */

export {
  API_BASE_URL,
  buildApiUrl,
};