import type multer from "multer";
import cloudinary from "../../lib/clients/cloudinary";
import { config } from "../../lib/config";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { extensionOf, MAX_VIDEO_FILE_SIZE, VIDEO_EXTENSIONS } from "./schema";

const FOLDER = "westforce/portfolios";

export type ResourceType = "video" | "image" | "raw";

export interface CloudinaryUpload {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  bytes: number;
}

export function resourceTypeOf(file: multer.File): ResourceType {
  const mimeType = (file.mimetype || "").toLowerCase();
  const extension = extensionOf(file.originalname);

  if (mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) return "video";
  if (mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return "image";
  }
  return "raw";
}

/** Cloudinary errors keep their status (status / http_code / statusCode) and message. */
function toAppError(error: unknown, fallback: string): AppError {
  if (error instanceof AppError) return error;

  const e = (error ?? {}) as { status?: number; http_code?: number; statusCode?: number; message?: string };
  const raw = e.status || e.http_code || e.statusCode || 500;
  const status = Number.isInteger(raw) && raw >= 400 ? raw : 500;

  return new AppError(status, e.message || fallback, { cause: error });
}

/**
 * Upload one in-memory file to Cloudinary. Protected documents (not videos)
 * are stored as "authenticated" so they need a signed URL to download.
 */
export function uploadToCloudinary(
  file: multer.File,
  isProtectedDocument = false,
  fallbackMessage = "File upload failed."
): Promise<CloudinaryUpload> {
  const resourceType = resourceTypeOf(file);
  const options = {
    folder: FOLDER,
    resource_type: resourceType,
    type: isProtectedDocument && resourceType !== "video" ? "authenticated" : "upload",
  } as const;

  logger.info(
    {
      file: file.originalname,
      mimetype: file.mimetype,
      resourceType,
      protected: isProtectedDocument,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
    },
    "Cloudinary upload started"
  );

  return new Promise<CloudinaryUpload>((resolve, reject) => {
    let settled = false;

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      logger.error({ err: error }, "Cloudinary upload failed");
      reject(toAppError(error, fallbackMessage));
    };

    const succeed = (result: Partial<CloudinaryUpload> | undefined) => {
      if (settled) return;
      if (!result?.public_id || !result.secure_url) {
        fail(new AppError(502, "Cloudinary returned an incomplete upload result."));
        return;
      }
      settled = true;
      logger.info(
        { publicId: result.public_id, resourceType: result.resource_type, size: result.bytes },
        "Cloudinary upload done"
      );
      resolve(result as CloudinaryUpload);
    };

    try {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
          fail(error);
          return;
        }
        succeed(result);
      });

      if (!stream || typeof stream.on !== "function") {
        fail(new Error("Cloudinary did not return a valid upload stream."));
        return;
      }

      stream.on("error", fail);
      stream.end(file.buffer);
    } catch (error) {
      fail(error);
    }
  });
}

/** Signed params so the browser can upload a video straight to Cloudinary. */
export function createVideoUploadSignature() {
  const current = cloudinary.config();
  const apiSecret = current.api_secret || config.CLOUDINARY_API_SECRET;
  const apiKey = current.api_key || config.CLOUDINARY_API_KEY;
  const cloudName = current.cloud_name || config.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    throw new AppError(500, "Cloudinary is not configured on the server.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { timestamp, folder: FOLDER, type: "upload", overwrite: false };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);

  return {
    apiKey,
    cloudName,
    signature,
    timestamp,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    params,
    resourceType: "video" as const,
    maxFileSize: MAX_VIDEO_FILE_SIZE,
  };
}
