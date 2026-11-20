import path from "node:path";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { toText } from "../../lib/text";

export const MB = 1024 * 1024;
/** Documents, images, direct video uploads through the server, and Supabase TUS videos. */
export const MAX_FILE_SIZE = 50 * MB;
/** Browser-to-Cloudinary signed video uploads. */
export const MAX_VIDEO_FILE_SIZE = 100 * MB;

export const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-matroska",
  "video/3gpp",
  "video/3gpp2",
  "application/octet-stream",
]);

export const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".m4", ".webm", ".avi"]);

export const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function extensionOf(filename: string): string {
  return path.extname(filename || "").toLowerCase();
}

/** Same loose reading as before: String(value || "").trim(). */
const text = (fallback = "") =>
  z.unknown().optional().transform((value) => toText(value || fallback).trim());

/** Same loose reading as before: Number(value || 0); may be NaN. */
const number = z.unknown().optional().transform((value) => Number(value || 0));

/** Express leaves req.body undefined when no JSON body is sent. */
const body = <T extends z.ZodRawShape>(shape: T) =>
  z.preprocess(
    (value) => (value && typeof value === "object" ? value : {}),
    z.object(shape)
  );

/** POST /video/init */
export const videoInitBody = body({
  filename: text(),
  contentType: text(),
  size: number,
});

/** POST /video/complete */
export const videoCompleteBody = body({
  path: text(),
  filename: text("introduction-video"),
  size: number,
});

/** POST /video-signature */
export const videoSignatureBody = body({
  filename: text(),
  contentType: text(),
  size: number,
  portfolioId: z.unknown().optional().transform((value) => value || null),
});

export type VideoInitBody = z.output<typeof videoInitBody>;
export type VideoCompleteBody = z.output<typeof videoCompleteBody>;
export type VideoSignatureBody = z.output<typeof videoSignatureBody>;

/**
 * Checks run one by one, in the original order, so each request still gets
 * the same first error (and 413 for size before a 400 for type where it was so).
 */
const bad = (message: string) => new AppError(400, message);
const tooBig = (message: string) => new AppError(413, message);

function requireFilename(filename: string): void {
  if (!filename) throw bad("Video filename is required.");
}

function requireValidSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) throw bad("A valid video size is required.");
}

export function checkVideoInit({ filename, contentType, size }: VideoInitBody): void {
  requireFilename(filename);
  if (!VIDEO_MIME_TYPES.has(contentType)) {
    throw bad("Only MP4, MOV and WebM videos are allowed.");
  }
  requireValidSize(size);
  if (size > MAX_FILE_SIZE) throw tooBig("Video must be smaller than 50 MB.");
}

export function checkVideoComplete({ path: storagePath }: VideoCompleteBody): void {
  if (!storagePath) throw bad("Video storage path is required.");
  if (!storagePath.startsWith("videos/")) throw bad("Invalid video storage path.");
}

export function checkVideoSignature({ filename, contentType, size }: VideoSignatureBody): void {
  requireFilename(filename);
  requireValidSize(size);
  if (size > MAX_VIDEO_FILE_SIZE) {
    throw tooBig(`Video must be smaller than ${MAX_VIDEO_FILE_SIZE / MB} MB.`);
  }
  if (!VIDEO_MIME_TYPES.has(contentType) && !VIDEO_EXTENSIONS.has(extensionOf(filename))) {
    throw bad("Only MP4, MOV, M4, M4V, WebM, and AVI videos are allowed.");
  }
}
