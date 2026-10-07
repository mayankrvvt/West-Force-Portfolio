const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const supabase = require("../config/supabase");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================================================
   CONFIGURATION
   ========================================================= */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-matroska",
  "video/3gpp",
  "video/3gpp2",
  "application/octet-stream",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".m4",
  ".webm",
  ".avi",
]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const SUPABASE_VIDEO_BUCKET =
  process.env.SUPABASE_VIDEO_BUCKET || "westforce-videos";

/* =========================================================
   MULTER
   Used only for documents/images.
   Videos no longer pass through this endpoint.
   ========================================================= */

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
  },

  fileFilter: (req, file, cb) => {
    const mimeType = (file.mimetype || "").toLowerCase();
    const extension = path
      .extname(file.originalname || "")
      .toLowerCase();

    console.log(
      "[upload] Checking file type:",
      file.originalname,
      mimeType,
      extension
    );

    const allowed =
      VIDEO_MIME_TYPES.has(mimeType) ||
      VIDEO_EXTENSIONS.has(extension) ||
      DOCUMENT_MIME_TYPES.has(mimeType) ||
      IMAGE_MIME_TYPES.has(mimeType);

    if (allowed) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only PDF, DOC, DOCX, JPG, PNG, WebP, MP4, MOV, M4, M4V and WebM files are allowed."
      )
    );
  },
});

const directVideoUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 - 1,
  },
  fileFilter: (req, file, cb) => {
    const mimeType = (file.mimetype || "").toLowerCase();
    const extension = path.extname(file.originalname || "").toLowerCase();

    if (VIDEO_MIME_TYPES.has(mimeType) || VIDEO_EXTENSIONS.has(extension)) {
      return cb(null, true);
    }

    return cb(new Error("Only supported video files can be uploaded."));
  },
});

/* =========================================================
   CLOUDINARY CONFIG
   Documents/images only.
   ========================================================= */

const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (cloudinaryUrl) {
  try {
    const parsed = new URL(cloudinaryUrl);

    cloudinary.config({
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username),
      api_secret: decodeURIComponent(parsed.password),
      secure: true,
    });

    console.log("Cloudinary configuration check:", {
      cloud_name: parsed.hostname,
      api_key: parsed.username
        ? "LOADED"
        : "MISSING",
      api_secret: parsed.password
        ? "LOADED"
        : "MISSING",
      secure: true,
    });
  } catch (error) {
    console.error(
      "Failed to parse CLOUDINARY_URL:",
      error.message
    );
  }
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log("Cloudinary configuration check:", {
    cloud_name:
      process.env.CLOUDINARY_CLOUD_NAME || "MISSING",

    api_key: process.env.CLOUDINARY_API_KEY
      ? "LOADED"
      : "MISSING",

    api_secret: process.env.CLOUDINARY_API_SECRET
      ? "LOADED"
      : "MISSING",

    secure: true,
  });
}

/* =========================================================
   SUPABASE CONFIG CHECK
   ========================================================= */

console.log("Supabase configuration check:", {
  url: process.env.SUPABASE_URL
    ? "LOADED"
    : "MISSING",

  secretKey: process.env.SUPABASE_SECRET_KEY
    ? "LOADED"
    : "MISSING",

  bucket: SUPABASE_VIDEO_BUCKET,
});

/* =========================================================
   HELPERS
   ========================================================= */

function getResourceType(file) {
  const mimeType = (file.mimetype || "").toLowerCase();
  const extension = path
    .extname(file.originalname || "")
    .toLowerCase();

  if (
    mimeType.startsWith("video/") ||
    VIDEO_EXTENSIONS.has(extension)
  ) {
    return "video";
  }

  if (
    mimeType.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
  ) {
    return "image";
  }

  return "raw";
}

function sanitizeFileName(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

function generateUniqueId() {
  return crypto.randomBytes(16).toString("hex");
}

/* =========================================================
   BUILD SUPABASE VIDEO PATH
   ========================================================= */

function buildVideoStoragePath(filename) {
  const extension =
    getExtension(filename) || ".mp4";

  const baseName = path.basename(
    filename,
    extension
  );

  const safeBaseName =
    sanitizeFileName(baseName) ||
    "intro-video";

  const uniqueId = generateUniqueId();

  const now = new Date();

  const year =
    now.getUTCFullYear();

  const month =
    String(now.getUTCMonth() + 1)
      .padStart(2, "0");

  const storagePath =
    `videos/${year}/${month}/${uniqueId}-${safeBaseName}${extension}`;

  return {
    storagePath,
    extension,
  };
}

/* =========================================================
   SUPABASE PUBLIC URL
   ========================================================= */

function ensureSupabaseClient() {
  if (!supabase || !supabase.storage) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY to enable video uploads."
    );
  }

  return supabase;
}

function getSupabasePublicUrl(storagePath) {
  const client = ensureSupabaseClient();

  const { data } =
    client.storage
      .from(SUPABASE_VIDEO_BUCKET)
      .getPublicUrl(storagePath);

  return data?.publicUrl || "";
}

/* =========================================================
   SUPABASE TUS ENDPOINT
   ========================================================= */

function getSupabaseTusEndpoint() {
  if (!process.env.SUPABASE_URL) {
    throw new Error(
      "SUPABASE_URL is missing from the server environment."
    );
  }

  ensureSupabaseClient();

  const supabaseHost =
    new URL(
      process.env.SUPABASE_URL
    ).hostname;

  const projectId =
    supabaseHost.split(".")[0];

  if (!projectId) {
    throw new Error(
      "Unable to determine Supabase project ID."
    );
  }

  return (
    `https://${projectId}.storage.supabase.co` +
    `/storage/v1/upload/resumable`
  );
}

/* =========================================================
   POST /api/uploads/video/init

   Creates a signed Supabase upload token.

   IMPORTANT:
   The actual video bytes DO NOT pass through Express.

   Browser
      ↓
   Supabase TUS
      ↓
   Supabase Storage
   ========================================================= */

router.get(
  "/video/config",
  async (req, res) => {
    try {
      const enabled = Boolean(
        process.env.SUPABASE_URL &&
          process.env.SUPABASE_SECRET_KEY
      );

      return res.status(200).json({
        success: true,
        enabled,
        mode: enabled ? "resumable" : "direct",
        message: enabled
          ? "Resumable video uploads are enabled."
          : "Supabase is not configured; direct Cloudinary uploads will be used.",
      });
    } catch (error) {
      console.error(
        "[upload] config check failed:",
        error
      );

      return res.status(500).json({
        success: false,
        enabled: false,
        mode: "direct",
        message:
          "Unable to determine upload configuration.",
      });
    }
  }
);

router.post(
  "/video/init",
  authenticateUser,
  async (req, res) => {
    try {
      const filename =
        String(
          req.body?.filename || ""
        ).trim();

      const contentType =
        String(
          req.body?.contentType || ""
        ).trim();

      const size =
        Number(
          req.body?.size || 0
        );

      /* ---------------------------------------------------
         Validate filename
         --------------------------------------------------- */

      if (!filename) {
        return res.status(400).json({
          success: false,
          message:
            "Video filename is required.",
        });
      }

      /* ---------------------------------------------------
         Validate MIME type
         --------------------------------------------------- */

      if (
        !VIDEO_MIME_TYPES.has(
          contentType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only MP4, MOV and WebM videos are allowed.",
        });
      }

      /* ---------------------------------------------------
         Validate size
         --------------------------------------------------- */

      if (
        !Number.isFinite(size) ||
        size <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid video size is required.",
        });
      }

      /* ---------------------------------------------------
         Maximum 50 MB
         --------------------------------------------------- */

      if (
        size > MAX_FILE_SIZE
      ) {
        return res.status(413).json({
          success: false,
          message:
            "Video must be smaller than 50 MB.",
        });
      }

      /* ---------------------------------------------------
         Generate unique storage path
         --------------------------------------------------- */

      const {
        storagePath,
        extension,
      } =
        buildVideoStoragePath(
          filename
        );

      console.log(
        "[supabase-tus] Creating signed upload:",
        {
          bucket:
            SUPABASE_VIDEO_BUCKET,

          path:
            storagePath,

          filename,

          contentType,

          size,

          sizeMB:
            (
              size /
              1024 /
              1024
            ).toFixed(2),
        }
      );

      /* ---------------------------------------------------
         Create signed Supabase upload URL
         --------------------------------------------------- */

      const {
        data,
        error,
      } =
        await supabase.storage
          .from(
            SUPABASE_VIDEO_BUCKET
          )
          .createSignedUploadUrl(
            storagePath,
            {
              upsert: false,
            }
          );

      if (error) {
        console.error(
          "[supabase-tus] Failed to create signed upload:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            error.message ||
            "Could not create a Supabase upload session.",
        });
      }

      /* ---------------------------------------------------
         Verify token
         --------------------------------------------------- */

      if (!data?.token) {
        console.error(
          "[supabase-tus] Supabase did not return an upload token."
        );

        return res.status(502).json({
          success: false,
          message:
            "Supabase did not return a signed upload token.",
        });
      }

      /* ---------------------------------------------------
         Public URL
         --------------------------------------------------- */

      const publicUrl =
        getSupabasePublicUrl(
          storagePath
        );

      /* ---------------------------------------------------
         TUS endpoint
         --------------------------------------------------- */

      const tusEndpoint =
        getSupabaseTusEndpoint();

      console.log(
        "[supabase-tus] Signed upload created:",
        {
          path: storagePath,
          tusEndpoint,
        }
      );

      /* ---------------------------------------------------
         Response
         --------------------------------------------------- */

      return res.status(200).json({
        success: true,

        bucket:
          SUPABASE_VIDEO_BUCKET,

        path:
          storagePath,

        token:
          data.token,

        publicUrl,

        tusEndpoint,

        resourceType:
          "video",

        format:
          extension.replace(
            ".",
            ""
          ),

        size,
      });
    } catch (error) {
      console.error(
        "[supabase-tus] Init failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Could not initialize the video upload.",
      });
    }
  }
);

/* =========================================================
   POST /api/uploads/video/complete

   Supabase already received the video through TUS.

   This endpoint simply returns the final public URL
   to the frontend.
   ========================================================= */

router.post(
  "/video/complete",
  authenticateUser,
  async (req, res) => {
    try {
      const storagePath =
        String(
          req.body?.path || ""
        ).trim();

      const originalName =
        String(
          req.body?.filename ||
            "introduction-video"
        ).trim();

      const size =
        Number(
          req.body?.size || 0
        );

      /* ---------------------------------------------------
         Validate path
         --------------------------------------------------- */

      if (!storagePath) {
        return res.status(400).json({
          success: false,
          message:
            "Video storage path is required.",
        });
      }

      if (
        !storagePath.startsWith(
          "videos/"
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid video storage path.",
        });
      }

      /* ---------------------------------------------------
         Generate public URL
         --------------------------------------------------- */

      const publicUrl =
        getSupabasePublicUrl(
          storagePath
        );

      if (!publicUrl) {
        return res.status(502).json({
          success: false,
          message:
            "Video uploaded, but Supabase did not return a public URL.",
        });
      }

      console.log(
        "[supabase-tus] Upload complete:",
        {
          path:
            storagePath,

          url:
            publicUrl,
        }
      );

      /* ---------------------------------------------------
         Return result
         --------------------------------------------------- */

      return res.status(200).json({
        success: true,

        message:
          "Video uploaded successfully.",

        file: {
          name:
            originalName,

          url:
            publicUrl,

          publicId:
            storagePath,

          resourceType:
            "video",

          format:
            getExtension(
              originalName
            ).replace(".", ""),

          size:
            Number.isFinite(size)
              ? size
              : 0,

          protected:
            false,

          isVideo:
            true,

          storage:
            "supabase",
        },
      });
    } catch (error) {
      console.error(
        "[supabase-tus] Complete failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Could not finalize the video upload.",
      });
    }
  }
);

/* =========================================================
   CLOUDINARY DOCUMENT / IMAGE / VIDEO UPLOAD
   ========================================================= */

function uploadToCloudinary(
  file,
  isProtectedDocument = false
) {
  return new Promise(
    (resolve, reject) => {
      const resourceType =
        getResourceType(file);

      const uploadOptions = {
        folder:
          "westforce/portfolios",

        resource_type:
          resourceType,

        type:
          isProtectedDocument &&
          resourceType !== "video"
            ? "authenticated"
            : "upload",
      };

      console.log(
        "[cloudinary] Starting document/image upload:",
        {
          file:
            file.originalname,

          mimetype:
            file.mimetype,

          resourceType,

          protected:
            isProtectedDocument,

          sizeMB:
            (
              file.size /
              1024 /
              1024
            ).toFixed(2),
        }
      );

      let settled = false;

      /* ---------------------------------------------------
         Failure handler
         --------------------------------------------------- */

      const fail = (error) => {
        if (settled) {
          return;
        }

        settled = true;

        console.error(
          "[cloudinary] Upload failed:",
          {
            message:
              error?.message,

            http_code:
              error?.http_code,

            name:
              error?.name,
          }
        );

        reject(error);
      };

      /* ---------------------------------------------------
         Success handler
         --------------------------------------------------- */

      const succeed = (
        result
      ) => {
        if (settled) {
          return;
        }

        if (
          !result ||
          !result.public_id ||
          !result.secure_url
        ) {
          const error =
            new Error(
              "Cloudinary returned an incomplete upload result."
            );

          error.status = 502;

          fail(error);

          return;
        }

        settled = true;

        console.log(
          "[cloudinary] Upload successful:",
          {
            publicId:
              result.public_id,

            resourceType:
              result.resource_type,

            url:
              result.secure_url,

            format:
              result.format,

            size:
              result.bytes,
          }
        );

        resolve(result);
      };

      /* ---------------------------------------------------
         Start Cloudinary upload
         --------------------------------------------------- */

      try {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            uploadOptions,

            (
              error,
              result
            ) => {
              if (error) {
                fail(error);
                return;
              }

              succeed(result);
            }
          );

        if (
          !uploadStream ||
          typeof uploadStream.on !==
            "function"
        ) {
          fail(
            new Error(
              "Cloudinary did not return a valid upload stream."
            )
          );

          return;
        }

        uploadStream.on(
          "error",
          fail
        );

        uploadStream.end(
          file.buffer
        );
      } catch (error) {
        fail(error);
      }
    }
  );
}

router.post(
  "/video",
  authenticateUser,
  (req, res, next) => {
    directVideoUpload.single("file")(req, res, (error) => {
      if (error) {
        return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
          success: false,
          message: error.code === "LIMIT_FILE_SIZE"
            ? "Compressed video must be smaller than 2 MB."
            : error.message || "Could not upload the video.",
        });
      }

      return next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No video was uploaded.",
      });
    }

    try {
      const result = await uploadToCloudinary(req.file, false);

      return res.status(201).json({
        success: true,
        message: "Video uploaded successfully.",
        file: {
          name: req.file.originalname,
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          size: result.bytes,
          storage: "cloudinary",
        },
      });
    } catch (error) {
      console.error("[cloudinary] Video upload failed:", error);
      return res.status(error.status || error.http_code || 500).json({
        success: false,
        message: error.message || "Video upload failed.",
      });
    }
  }
);

/* =========================================================
   POST /api/uploads

   Documents/images → Cloudinary.

   Videos are intentionally rejected here.

   IMPORTANT:
   Do NOT send large videos to this endpoint.
   Use /api/uploads/video/init instead.
   ========================================================= */

router.post(
  "/",
  authenticateUser,

  /* -------------------------------------------------------
     Request logging
     ------------------------------------------------------- */

  (req, res, next) => {
    console.log("");

    console.log(
      "=========================================="
    );

    console.log(
      "[upload] Request arrived"
    );

    console.log(
      "=========================================="
    );

    next();
  },

  /* -------------------------------------------------------
     Multer
     ------------------------------------------------------- */

  upload.single("file"),

  /* -------------------------------------------------------
     Upload handler
     ------------------------------------------------------- */

  async (req, res) => {
    try {
      /* ---------------------------------------------------
         Check file
         --------------------------------------------------- */

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "No file was uploaded.",
        });
      }

      console.log(
        "[upload] Multer received:",
        {
          name:
            req.file.originalname,

          mimetype:
            req.file.mimetype,

          size:
            req.file.size,

          sizeMB:
            (
              req.file.size /
              1024 /
              1024
            ).toFixed(2),
        }
      );

      /* ---------------------------------------------------
         Detect video
         --------------------------------------------------- */

      const isVideo =
        req.file.mimetype.startsWith(
          "video/"
        );

      if (isVideo) {
        return res.status(400).json({
          success: false,
          message: "Upload compressed videos to /api/uploads/video.",
        });
      }

      /* ---------------------------------------------------
         Protected document
         --------------------------------------------------- */

      const isProtectedDocument =
        req.body?.protected ===
        "true";

      console.log(
        "[upload] Document/image detected."
      );

      console.log(
        "[upload] Protected:",
        isProtectedDocument
      );

      /* ---------------------------------------------------
         Upload to Cloudinary
         --------------------------------------------------- */

      const result =
        await uploadToCloudinary(
          req.file,
          isProtectedDocument
        );

      /* ---------------------------------------------------
         Response
         --------------------------------------------------- */

      return res.status(200).json({
        success: true,

        message:
          "File uploaded successfully.",

        file: {
          name:
            req.file.originalname,

          url:
            result.secure_url,

          publicId:
            result.public_id,

          resourceType:
            result.resource_type,

          format:
            result.format,

          size:
            result.bytes,

          protected:
            isProtectedDocument,

          isVideo,

          storage:
            "cloudinary",
        },
      });
    } catch (error) {
      console.error(
        "[upload] Failed:",
        {
          message:
            error?.message,

          http_code:
            error?.http_code,

          statusCode:
            error?.statusCode,

          name:
            error?.name,

          stack:
            error?.stack,
        }
      );

      const status =
        error?.status ||
        error?.http_code ||
        error?.statusCode ||
        500;

      return res
        .status(
          status >= 400
            ? status
            : 500
        )
        .json({
          success: false,

          message:
            error?.message ||
            "File upload failed.",
        });
    }
  }
);

/* =========================================================
   MULTER ERROR HANDLER
   ========================================================= */

router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "[upload] Middleware error:",
      {
        message:
          error?.message,

        code:
          error?.code,

        name:
          error?.name,
      }
    );

    /* -----------------------------------------------------
       Multer errors
       ----------------------------------------------------- */

    if (
      error instanceof
      multer.MulterError
    ) {
      /* ---------------------------------------------------
         File too large
         --------------------------------------------------- */

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(413).json({
          success: false,

          message:
            "File is too large. Maximum size is 50 MB.",
        });
      }

      /* ---------------------------------------------------
         Other Multer errors
         --------------------------------------------------- */

      return res.status(400).json({
        success: false,

        message:
          error.message,
      });
    }

    /* -----------------------------------------------------
       General middleware error
       ----------------------------------------------------- */

    return res.status(400).json({
      success: false,

      message:
        error?.message ||
        "File upload failed.",
    });
  }
);

/* =========================================================
   EXPORT
   ========================================================= */

module.exports = router;