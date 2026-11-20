import crypto from "node:crypto";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import supabase from "../../lib/clients/supabase";
import { config } from "../../lib/config";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { extensionOf, type VideoCompleteBody, type VideoInitBody } from "./schema";

// Large videos go browser -> Supabase Storage (TUS resumable upload).
// The bytes never pass through Express; these helpers only sign and finish uploads.
export const SUPABASE_VIDEO_BUCKET = config.SUPABASE_VIDEO_BUCKET;

/** Resumable uploads need the Supabase URL and the secret (service) key. */
export function isResumableEnabled(): boolean {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SECRET_KEY);
}

function requireSupabase(): SupabaseClient {
  if (!supabase?.storage) {
    throw new AppError(
      500,
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY to enable video uploads."
    );
  }
  return supabase;
}

function sanitizeFileName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

/** videos/<yyyy>/<mm>/<32 hex>-<safe name><ext> */
export function buildVideoStoragePath(filename: string): { storagePath: string; extension: string } {
  const extension = extensionOf(filename) || ".mp4";
  const safeBaseName = sanitizeFileName(path.basename(filename, extension)) || "intro-video";
  const uniqueId = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return {
    storagePath: `videos/${year}/${month}/${uniqueId}-${safeBaseName}${extension}`,
    extension,
  };
}

function publicUrlFor(storagePath: string): string {
  const { data } = requireSupabase().storage.from(SUPABASE_VIDEO_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl || "";
}

function tusEndpoint(): string {
  if (!config.SUPABASE_URL) {
    throw new AppError(500, "SUPABASE_URL is missing from the server environment.");
  }
  requireSupabase();

  const projectId = new URL(config.SUPABASE_URL).hostname.split(".")[0];
  if (!projectId) {
    throw new AppError(500, "Unable to determine Supabase project ID.");
  }

  return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
}

/** Create a signed Supabase upload token for one new video. */
export async function initVideoUpload({ filename, contentType, size }: VideoInitBody) {
  const client = requireSupabase();
  const { storagePath, extension } = buildVideoStoragePath(filename);

  logger.info(
    { bucket: SUPABASE_VIDEO_BUCKET, path: storagePath, contentType, size },
    "Supabase signed upload requested"
  );

  const { data, error } = await client.storage
    .from(SUPABASE_VIDEO_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error) {
    throw new AppError(500, error.message || "Could not create a Supabase upload session.", {
      cause: error,
    });
  }

  if (!data?.token) {
    throw new AppError(502, "Supabase did not return a signed upload token.");
  }

  return {
    bucket: SUPABASE_VIDEO_BUCKET,
    path: storagePath,
    token: data.token,
    publicUrl: publicUrlFor(storagePath),
    tusEndpoint: tusEndpoint(),
    resourceType: "video" as const,
    format: extension.replace(".", ""),
    size,
  };
}

/** The browser finished the TUS upload: return the file's public URL and details. */
export function completeVideoUpload({ path: storagePath, filename, size }: VideoCompleteBody) {
  const url = publicUrlFor(storagePath);

  if (!url) {
    throw new AppError(502, "Video uploaded, but Supabase did not return a public URL.");
  }

  logger.info({ path: storagePath }, "Supabase upload complete");

  return {
    name: filename,
    url,
    publicId: storagePath,
    resourceType: "video" as const,
    format: extensionOf(filename).replace(".", ""),
    size: Number.isFinite(size) ? size : 0,
    protected: false,
    isVideo: true,
    storage: "supabase" as const,
  };
}
