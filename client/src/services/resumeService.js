import {
  apiRequest,
  uploadFile,
} from "../utils/api";

/**
 * ======================================================
 * BUILD AI RESUME
 * ======================================================
 */

export async function buildResume({
  portfolio,
  targetRole,
  country,
  experienceLevel,
  options,
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

        options:
          options || [],
      }),
    }
  );

  if (!response?.resume) {
    throw new Error(
      response?.message ||
        response?.error ||
        "Gemini did not return a resume."
    );
  }

  return response;
}

/**
 * ======================================================
 * ENHANCE EXISTING RESUME
 * ======================================================
 *
 * Supported:
 * - PDF
 * - DOC
 * - DOCX
 *
 * Flow:
 *
 * React
 *   ↓
 * uploadFile()
 *   ↓
 * FormData
 *   ↓
 * /api/resumes/enhance
 *   ↓
 * Backend
 *   ↓
 * Multer
 *   ↓
 * Resume text extraction
 *   ↓
 * Gemini
 *   ↓
 * Enhanced resume
 */

export async function enhanceResume({
  file,
  portfolio,
  options,
  targetRole,
  country,
}) {
  if (!file) {
    throw new Error(
      "Resume file is required."
    );
  }

  /**
   * ----------------------------------------------------
   * Validate file size
   * ----------------------------------------------------
   */

  const MAX_FILE_SIZE =
    10 * 1024 * 1024;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Resume file must be smaller than 10 MB."
    );
  }

  /**
   * ----------------------------------------------------
   * Validate file type
   * ----------------------------------------------------
   */

  const allowedMimeTypes = [
    "application/pdf",

    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
  ];

  const fileName =
    file.name?.toLowerCase() || "";

  const validMimeType =
    allowedMimeTypes.includes(
      file.type
    );

  const validExtension =
    allowedExtensions.some(
      (extension) =>
        fileName.endsWith(extension)
    );

  if (
    !validMimeType &&
    !validExtension
  ) {
    throw new Error(
      "Unsupported resume format. Please upload a PDF, DOC, or DOCX file."
    );
  }

  /**
   * ----------------------------------------------------
   * Log request
   * ----------------------------------------------------
   */

  console.log(
    "[Resume Enhancer] Starting enhancement..."
  );

  console.log(
    "[Resume Enhancer] File:",
    file.name
  );

  console.log(
    "[Resume Enhancer] Type:",
    file.type
  );

  console.log(
    "[Resume Enhancer] Size:",
    file.size
  );

  console.log(
    "[Resume Enhancer] Target role:",
    targetRole ||
      "Software Engineer"
  );

  console.log(
    "[Resume Enhancer] Country:",
    country ||
      "Canada"
  );

  /**
   * ----------------------------------------------------
   * Upload resume
   * ----------------------------------------------------
   *
   * IMPORTANT:
   *
   * Do NOT use fetch() directly here.
   *
   * uploadFile() handles:
   *
   * - Firebase authentication
   * - FormData
   * - Authorization
   * - API URL
   * - JSON response
   *
   */

  const response =
    await uploadFile(
      "/api/resumes/enhance",
      file,
      {
        fieldName: "file",

        fields: {
          portfolio:
            JSON.stringify(
              portfolio || {}
            ),

          options:
            JSON.stringify(
              options || []
            ),

          targetRole:
            targetRole ||
            "Software Engineer",

          country:
            country ||
            "Canada",
        },
      }
    );

  /**
   * ----------------------------------------------------
   * Validate response
   * ----------------------------------------------------
   */

  console.log(
    "[Resume Enhancer] Server response:",
    response
  );

  if (!response) {
    throw new Error(
      "No response received from the resume enhancement server."
    );
  }

  if (!response.resume) {
    throw new Error(
      response.message ||
        response.error ||
        "Gemini did not return an enhanced resume."
    );
  }

  console.log(
    "[Resume Enhancer] Enhancement completed successfully."
  );

  return response;
}

/**
 * ======================================================
 * GET ALL SAVED RESUMES
 * ======================================================
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
 * GET SINGLE RESUME
 * ======================================================
 */

export async function getResume(
  resumeId
) {
  if (!resumeId) {
    throw new Error(
      "Resume ID is required."
    );
  }

  const response =
    await apiRequest(
      `/api/resumes/${resumeId}`
    );

  return response?.resume;
}

/**
 * ======================================================
 * SAVE RESUME
 * ======================================================
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

  return response;
}