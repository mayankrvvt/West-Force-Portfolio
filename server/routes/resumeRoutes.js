const express = require("express");
const multer = require("multer");

const Resume = require("../models/Resume");
const authenticateUser = require("../middleware/authMiddleware");

const {
  buildResumeWithGemini,
  enhanceResumeWithGemini,
} = require("../services/geminiResumeService");

const router = express.Router();

/* ======================================================
   MULTER CONFIGURATION
   ====================================================== */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Unsupported resume file type. Please upload a PDF, DOC, or DOCX file."
        )
      );
    }

    cb(null, true);
  },
});

/* ======================================================
   GET USER ID
   ====================================================== */

function getUserId(req) {
  return (
    req.user?.uid ||
    req.user?.userId ||
    req.user?.id ||
    req.user?._id ||
    null
  );
}

/* ======================================================
   SAFE JSON PARSER
   ====================================================== */

function parseJsonField(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Failed to parse JSON field:", error);
    return fallback;
  }
}

/* ======================================================
   EXTRACT RESUME TEXT
   ====================================================== */

/**
 * ======================================================
 * EXTRACT RESUME TEXT
 * ======================================================
 *
 * Supports:
 *   - PDF
 *   - DOCX
 *
 * The extracted text is sent to Gemini for
 * AI resume enhancement.
 *
 * ======================================================
 */

async function extractResumeText(file) {
  if (!file) {
    throw new Error("Resume file is required.");
  }

  /* ====================================================
     PDF
     ==================================================== */

  if (file.mimetype === "application/pdf") {
    let PDFParse;

    try {
      ({ PDFParse } = require("pdf-parse"));
    } catch (error) {
      console.error("Failed to load pdf-parse:", error);

      throw new Error(
        "pdf-parse is not installed. Run: npm install pdf-parse"
      );
    }

    if (!PDFParse) {
      throw new Error(
        "The installed pdf-parse package does not expose PDFParse."
      );
    }

    let parser;

    try {
      parser = new PDFParse({
        data: file.buffer,
      });

      const result = await parser.getText();

      const text = result?.text?.trim() || "";

      if (!text) {
        throw new Error(
          "Could not extract text from the PDF. The PDF may be scanned or image-based."
        );
      }

      return text;
    } catch (error) {
      console.error("PDF text extraction error:", error);

      throw new Error(
        error?.message || "Failed to extract text from the PDF."
      );
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (destroyError) {
          console.error(
            "Failed to destroy PDF parser:",
            destroyError
          );
        }
      }
    }
  }

  /* ====================================================
     DOCX
     ==================================================== */

  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    let mammoth;

    try {
      mammoth = require("mammoth");
    } catch (error) {
      console.error("Failed to load mammoth:", error);

      throw new Error(
        "mammoth is not installed. Run: npm install mammoth"
      );
    }

    try {
      const result = await mammoth.extractRawText({
        buffer: file.buffer,
      });

      const text = result?.value?.trim() || "";

      if (!text) {
        throw new Error(
          "Could not extract text from the DOCX file."
        );
      }

      return text;
    } catch (error) {
      console.error("DOCX text extraction error:", error);

      throw new Error(
        error?.message || "Failed to extract text from the DOCX file."
      );
    }
  }

  /* ====================================================
     LEGACY DOC
     ==================================================== */

  if (file.mimetype === "application/msword") {
    throw new Error(
      "Legacy .doc files are not supported for AI enhancement yet. Please upload a PDF or DOCX file."
    );
  }

  /* ====================================================
     UNSUPPORTED FILE
     ==================================================== */

  throw new Error(
    "Unsupported resume file type. Please upload a PDF, DOC, or DOCX file."
  );
}

/* ======================================================
   GET ALL RESUMES
   ====================================================== */

router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authenticated user ID could not be determined.",
      });
    }

    const resumes = await Resume.find({
      userId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      resumes,
    });
  } catch (error) {
    console.error("GET /api/resumes error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to load resumes.",
    });
  }
});

/* ======================================================
   GET SINGLE RESUME
   ====================================================== */

router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authenticated user ID could not be determined.",
      });
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      userId,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    return res.status(200).json({
      success: true,
      resume,
    });
  } catch (error) {
    console.error("GET /api/resumes/:id error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to load resume.",
    });
  }
});

/* ======================================================
   BUILD AI RESUME
   ====================================================== */

router.post("/build", authenticateUser, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user ID could not be determined.",
      });
    }

    const {
      portfolio,
      targetRole,
      country,
      experienceLevel,
      options,
    } = req.body || {};

    if (!portfolio) {
      return res.status(400).json({
        success: false,
        message: "Portfolio data is required.",
      });
    }

    console.log("AI Resume Builder request received:", {
      userId,
      targetRole,
      country,
      experienceLevel,
    });

    const generatedResult = await buildResumeWithGemini({
      portfolio,
      targetRole,
      country,
      experienceLevel,
      options,
      userId,
    });

    const resume =
      generatedResult?.resume ||
      generatedResult?.data ||
      generatedResult;

    if (!resume) {
      throw new Error(
        "Gemini did not return a resume."
      );
    }

    return res.status(200).json({
      success: true,
      resume,
    });
  } catch (error) {
    console.error("POST /api/resumes/build error:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to build resume using AI.",
    });
  }
});

/* ======================================================
   ENHANCE EXISTING RESUME
   ====================================================== */

router.post(
  "/enhance",
  authenticateUser,
  upload.single("file"),
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user ID could not be determined.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a resume file.",
        });
      }

      console.log("AI Resume Enhancer request received:", {
        userId,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      });

      /* -----------------------------------------------
         Extract text from uploaded resume
         ----------------------------------------------- */

      const resumeText = await extractResumeText(
        req.file
      );

      if (!resumeText) {
        return res.status(400).json({
          success: false,
          message:
            "No readable text could be extracted from the resume.",
        });
      }

      /* -----------------------------------------------
         Parse frontend fields
         ----------------------------------------------- */

      const portfolio = parseJsonField(
        req.body?.portfolio,
        {}
      );

      const options = parseJsonField(
        req.body?.options,
        {}
      );

      const targetRole =
        req.body?.targetRole || "";

      const country =
        req.body?.country || "";

      /* -----------------------------------------------
         Send resume to Gemini
         ----------------------------------------------- */

      const generatedResult =
        await enhanceResumeWithGemini({
          resumeText,
          portfolio,
          options,
          targetRole,
          country,
          userId,
        });

      const resume =
        generatedResult?.resume ||
        generatedResult?.data ||
        generatedResult;

      if (!resume) {
        throw new Error(
          "Gemini did not return an enhanced resume."
        );
      }

      console.log(
        "Resume enhanced successfully."
      );

      return res.status(200).json({
        success: true,
        resume,
      });
    } catch (error) {
      console.error(
        "POST /api/resumes/enhance error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to enhance resume using AI.",
      });
    }
  }
);

/* ======================================================
   SAVE RESUME
   ====================================================== */

router.post("/", authenticateUser, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated user ID could not be determined.",
      });
    }

    const {
      resume,
      title,
      targetRole,
      country,
      type,
      status,
    } = req.body || {};

    if (!resume) {
      return res.status(400).json({
        success: false,
        message: "Resume data is required.",
      });
    }

    const savedResume = await Resume.create({
      userId,

      title:
        title ||
        resume?.title ||
        "AI Generated Resume",

      targetRole:
        targetRole ||
        resume?.targetRole ||
        "",

      country:
        country ||
        resume?.country ||
        "",

      type:
        type ||
        "ai-generated",

      status:
        status ||
        "completed",

      content: resume,
    });

    return res.status(201).json({
      success: true,
      resume: savedResume,
    });
  } catch (error) {
    console.error("POST /api/resumes error:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to save resume.",
    });
  }
});

/* ======================================================
   DELETE RESUME
   ====================================================== */

router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated user ID could not be determined.",
      });
    }

    const deletedResume =
      await Resume.findOneAndDelete({
        _id: req.params.id,
        userId,
      });

    if (!deletedResume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/resumes/:id error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to delete resume.",
    });
  }
});

/* ======================================================
   MULTER / ROUTE ERROR HANDLER
   ====================================================== */

router.use((error, req, res, next) => {
  console.error("Resume route error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "Resume file is too large. Maximum size is 10 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(400).json({
    success: false,
    message:
      error?.message ||
      "Resume request failed.",
  });
});

/* ======================================================
   EXPORT ROUTER
   ====================================================== */

module.exports = router;