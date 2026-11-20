import type { RequestHandler } from "express";
import multer from "multer";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import {
  DOCUMENT_MIME_TYPES,
  extensionOf,
  IMAGE_MIME_TYPES,
  MAX_FILE_SIZE,
  VIDEO_EXTENSIONS,
  VIDEO_MIME_TYPES,
} from "./schema";

// All multer setup for uploads lives here. Files stay in memory and go straight to Cloudinary.
const storage = multer.memoryStorage();

/** A video by mimetype or by file extension (some browsers send application/octet-stream). */
export function isVideo(file: multer.File): boolean {
  const mimeType = (file.mimetype || "").toLowerCase();
  return VIDEO_MIME_TYPES.has(mimeType) || VIDEO_EXTENSIONS.has(extensionOf(file.originalname));
}

/** POST /api/uploads: documents and images (videos pass the filter, the handler rejects them). */
const fileUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const mimeType = (file.mimetype || "").toLowerCase();
    const allowed =
      isVideo(file) || DOCUMENT_MIME_TYPES.has(mimeType) || IMAGE_MIME_TYPES.has(mimeType);

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

/** POST /api/uploads/video: direct video upload through the server. */
const videoUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (isVideo(file)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only supported video files can be uploaded."));
  },
});

/**
 * Run multer's .single("file") and turn its errors into AppErrors:
 * file too large -> 413 with `tooLargeMessage`, anything else -> 400 with its message.
 */
function singleFile(uploader: multer.Multer, tooLargeMessage: string, fallback: string): RequestHandler {
  const handler = uploader.single("file");

  return (req, res, next) => {
    handler(req, res, (error?: unknown) => {
      if (!error) {
        next();
        return;
      }

      const code = (error as { code?: unknown }).code;
      const message = error instanceof Error && error.message ? error.message : fallback;

      (req.log ?? logger).warn({ err: error }, "Upload middleware error");
      next(
        code === "LIMIT_FILE_SIZE"
          ? new AppError(413, tooLargeMessage, { cause: error })
          : new AppError(400, message, { cause: error })
      );
    });
  };
}

export const singleUploadFile = singleFile(
  fileUpload,
  "File is too large. Maximum size is 50 MB.",
  "File upload failed."
);

// This route goes through the server, so it uses the 50 MB server limit.
// Bigger videos (up to MAX_VIDEO_FILE_SIZE) use the signed direct upload instead.
export const singleVideoFile = singleFile(
  videoUpload,
  "Video must be smaller than 50 MB.",
  "Could not upload the video."
);
