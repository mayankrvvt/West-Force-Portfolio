import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5050";

function buildApiUrl(endpoint) {
  if (
    endpoint.startsWith("http://") ||
    endpoint.startsWith("https://")
  ) {
    return endpoint;
  }

  const normalizedBase = API_BASE_URL.replace(/\/$/, "");

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${normalizedBase}${normalizedEndpoint}`;
}

/**
 * Wait until Firebase has finished restoring the authentication state.
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

/**
 * Get the currently authenticated Firebase user.
 */
async function getAuthenticatedUser() {
  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  } else {
    await waitForAuthUser();
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user;
}

/**
 * Get Firebase authentication headers.
 */
async function getAuthHeaders() {
  const user = await getAuthenticatedUser();

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Standard JSON API request.
 */
export async function apiRequest(endpoint, options = {}) {
  const tokenHeaders = await getAuthHeaders();

  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...tokenHeaders,
    },
  });

  const contentType =
    response.headers.get("content-type") || "";

  let result;

  if (contentType.includes("application/json")) {
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
    const rawText = await response.text();

    console.error(
      "Server returned a non-JSON response:",
      {
        status: response.status,
        statusText: response.statusText,
        contentType,
        body: rawText.slice(0, 1000),
      }
    );

    throw new Error(
      `Server returned a non-JSON response (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error ||
        `API request failed (${response.status}).`
    );
  }

  return result;
}

/**
 * Upload a file using multipart/form-data.
 */
export async function uploadFile(endpoint, file) {
  if (!file) {
    throw new Error("A file is required.");
  }

  const tokenHeaders = await getAuthHeaders();

  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(buildApiUrl(endpoint), {
    method: "POST",
    headers: tokenHeaders,
    body: formData,
  });

  const contentType =
    response.headers.get("content-type") || "";

  let result;

  if (contentType.includes("application/json")) {
    try {
      result = await response.json();
    } catch {
      throw new Error(
        `Upload server returned invalid JSON (${response.status}).`
      );
    }
  } else {
    const rawText = await response.text();

    console.error(
      "Upload server returned non-JSON response:",
      rawText.slice(0, 1000)
    );

    throw new Error(
      `Upload server returned a non-JSON response (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error ||
        `File upload failed (${response.status}).`
    );
  }

  return result;
}