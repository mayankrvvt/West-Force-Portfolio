import {
  apiRequest,
  waitForAuthUser,
} from "../utils/api";

/**
 * ======================================================
 * BUILD RESUME
 * ======================================================
 *
 * Sends the user's WestForce portfolio to the backend.
 *
 * Frontend
 *   ↓
 * /api/resumes/build
 *   ↓
 * Gemini
 *   ↓
 * Canadian resume JSON
 *
 */

export async function buildResume({
  portfolio,
  targetRole,
  country,
  experienceLevel,
}) {
  if (!portfolio) {
    throw new Error(
      "Portfolio information is required."
    );
  }

  const response = await apiRequest(
    "/api/resumes/build",
    {
      method: "POST",

      body: JSON.stringify({
        portfolio,

        targetRole:
          targetRole ||
          "Software Engineer",

        country:
          country ||
          "Canada",

        experienceLevel:
          experienceLevel ||
          "Entry Level",
      }),
    }
  );

  if (!response?.resume) {
    throw new Error(
      response?.message ||
        "Gemini did not return a resume."
    );
  }

  return response;
}

/**
 * ======================================================
 * ENHANCE RESUME
 * ======================================================
 *
 * Sends the actual PDF/DOC/DOCX file to the backend.
 *
 * Frontend
 *   ↓
 * FormData
 *   ↓
 * /api/resumes/enhance
 *   ↓
 * Multer
 *   ↓
 * Text extraction
 *   ↓
 * Gemini
 *   ↓
 * Enhanced resume JSON
 *
 */

export async function enhanceResume({
  file,
  portfolio,
  options,
  targetRole,
  country,
}) {
  // ----------------------------------------------------
  // Make sure a file was provided
  // ----------------------------------------------------

  if (!file) {
    throw new Error(
      "Resume file is required."
    );
  }

  // ----------------------------------------------------
  // Wait for Firebase authentication
  // ----------------------------------------------------

  const user = await waitForAuthUser();

  if (!user) {
    throw new Error(
      "You must be signed in."
    );
  }

  console.log(
    "Firebase user authenticated for resume enhancement:",
    user.uid
  );

  // ----------------------------------------------------
  // Get Firebase ID token
  // ----------------------------------------------------

  const token =
    await user.getIdToken();

  // ----------------------------------------------------
  // Create multipart form data
  // ----------------------------------------------------

  const formData =
    new FormData();

  // IMPORTANT:
  // Send the actual File object.
  //
  // Do NOT upload the resume to Cloudinary first.
  //
  // The backend /api/resumes/enhance endpoint
  // uses Multer memoryStorage to receive this file.

  formData.append(
    "file",
    file
  );

  // ----------------------------------------------------
  // Portfolio information
  // ----------------------------------------------------

  formData.append(
    "portfolio",
    JSON.stringify(
      portfolio || {}
    )
  );

  // ----------------------------------------------------
  // Selected AI improvements
  // ----------------------------------------------------

  formData.append(
    "options",
    JSON.stringify(
      options || []
    )
  );

  // ----------------------------------------------------
  // Target role
  // ----------------------------------------------------

  formData.append(
    "targetRole",
    targetRole ||
      "Software Engineer"
  );

  // ----------------------------------------------------
  // Target country
  // ----------------------------------------------------

  formData.append(
    "country",
    country ||
      "Canada"
  );

  /**
   * ====================================================
   * SEND REQUEST
   * ====================================================
   *
   * Do NOT manually set Content-Type.
   *
   * The browser automatically creates:
   *
   * multipart/form-data;
   * boundary=...
   *
   */

  const response =
    await fetch(
      "/api/resumes/enhance",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        body: formData,
      }
    );

  // ----------------------------------------------------
  // Read response safely
  // ----------------------------------------------------

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let result;

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
        "Failed to parse resume enhancement response:",
        error
      );

      throw new Error(
        `The server returned invalid JSON (${response.status}).`
      );
    }
  } else {
    const rawText =
      await response.text();

    console.error(
      "Resume enhancement returned a non-JSON response:",
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
      `The server returned a non-JSON response (${response.status}).`
    );
  }

  // ----------------------------------------------------
  // Handle backend errors
  // ----------------------------------------------------

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error ||
        `Resume enhancement failed (${response.status}).`
    );
  }

  // ----------------------------------------------------
  // Make sure Gemini returned a resume
  // ----------------------------------------------------

  if (!result?.resume) {
    throw new Error(
      "Gemini did not return an enhanced resume."
    );
  }

  return result;
}

/**
 * ======================================================
 * GET SAVED RESUMES
 * ======================================================
 *
 * Gets all resumes belonging to the authenticated user.
 *
 */

export async function getResumes() {
  const response =
    await apiRequest(
      "/api/resumes"
    );

  return (
    response?.resumes ||
    []
  );
}

/**
 * ======================================================
 * SAVE RESUME
 * ======================================================
 *
 * Sends the resume to the backend.
 *
 * The backend can create/update the resume
 * depending on the data it receives.
 *
 */

export async function saveResume(
  resume
) {
  if (!resume) {
    throw new Error(
      "Resume data is required."
    );
  }

  const response =
    await apiRequest(
      "/api/resumes",
      {
        method: "POST",

        body: JSON.stringify({
          resume,
        }),
      }
    );

  if (!response?.resume) {
    throw new Error(
      response?.message ||
        "Failed to save resume."
    );
  }

  return response;
}