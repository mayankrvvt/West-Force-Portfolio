import {
  apiRequest,
  uploadFile,
} from "../utils/api";

/**
 * ======================================================
 * BUILD AI RESUME
 * ======================================================
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

  console.log(
    "[Resume Enhancer] Starting enhancement"
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

  const response = await uploadFile(
    "/api/resumes/enhance",
    file,
    {
      fieldName: "file",

      fields: {
        portfolio: JSON.stringify(
          portfolio || {}
        ),

        options: JSON.stringify(
          options || {}
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

  console.log(
    "[Resume Enhancer] Response:",
    response
  );

  if (!response) {
    throw new Error(
      "No response received from resume enhancement API."
    );
  }

  if (!response.resume) {
    throw new Error(
      response.message ||
        response.error ||
        "Gemini did not return an enhanced resume."
    );
  }

  return response;
}

/**
 * ======================================================
 * GET SAVED RESUMES
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

/**
 * ======================================================
 * DELETE RESUME
 * ======================================================
 */

export async function deleteResume(
  resumeId
) {
  if (!resumeId) {
    throw new Error(
      "Resume ID is required."
    );
  }

  return await apiRequest(
    `/api/resumes/${resumeId}`,
    {
      method: "DELETE",
    }
  );
}