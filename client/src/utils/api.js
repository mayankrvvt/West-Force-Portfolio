import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

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

export function waitForAuthUser() {
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

  console.log(
    `[API] ${
      options.method || "GET"
    } ${url}`
  );

  console.log(
    "[API] Firebase Authorization:",
    Boolean(
      requestHeaders.Authorization
    )
  );

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
    const error =
      new Error(
        result?.message ||
          result?.error ||
          `API request failed (${response.status}).`
      );

    error.status =
      response.status;

    error.data =
      result;

    throw error;
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

  console.log(
    `[UPLOAD] ${
      options.method || "POST"
    } ${url}`
  );

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
    const error =
      new Error(
        result?.message ||
          result?.error ||
          `File upload failed (${response.status}).`
      );

    error.status =
      response.status;

    error.data =
      result;

    throw error;
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
  const response =
    await fetch(
      buildApiUrl(endpoint),
      {
        ...options,

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
    const error =
      new Error(
        result?.message ||
          result?.error ||
          `API request failed (${response.status}).`
      );

    error.status =
      response.status;

    error.data =
      result;

    throw error;
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