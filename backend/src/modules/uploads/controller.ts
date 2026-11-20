import type { Request, Response } from "express";
import { AppError, failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import Portfolio from "../portfolios/model";
import User from "../users/model";
import { createVideoUploadSignature, uploadToCloudinary } from "./media.service";
import { isVideo } from "./multer";
import {
  checkVideoComplete,
  checkVideoInit,
  checkVideoSignature,
  videoCompleteBody,
  videoInitBody,
  videoSignatureBody,
} from "./schema";
import { completeVideoUpload, initVideoUpload, isResumableEnabled } from "./video.service";

/** GET /video/config — tells the frontend which video upload path to use. */
export function getVideoConfig(_req: Request, res: Response): void {
  const enabled = isResumableEnabled();

  ok(res, {
    enabled,
    mode: enabled ? "resumable" : "direct",
    message: enabled
      ? "Resumable video uploads are enabled."
      : "Supabase is not configured; direct Cloudinary uploads will be used.",
  });
}

/** POST /video/init — signed Supabase TUS upload. */
export async function initVideo(req: Request, res: Response): Promise<void> {
  const body = parse(videoInitBody, req.body);
  checkVideoInit(body);

  const result = await failWith("Could not initialize the video upload.", () =>
    initVideoUpload(body)
  );

  ok(res, result);
}

/** POST /video/complete — returns the public URL of a finished TUS upload. */
export async function completeVideo(req: Request, res: Response): Promise<void> {
  const body = parse(videoCompleteBody, req.body);
  checkVideoComplete(body);

  const file = await failWith("Could not finalize the video upload.", () =>
    Promise.resolve(completeVideoUpload(body))
  );

  ok(res, { message: "Video uploaded successfully.", file });
}

/** POST /video-signature — signed params for a browser-to-Cloudinary video upload. */
export async function signVideoUpload(req: Request, res: Response): Promise<void> {
  const body = parse(videoSignatureBody, req.body);
  checkVideoSignature(body);

  const signed = await failWith(
    "Could not generate a secure Cloudinary upload signature.",
    async () => {
      const user = await User.findOne({ firebaseUid: currentUser(req).uid });

      if (!user) {
        throw new AppError(404, "Authenticated user not found.");
      }

      if (body.portfolioId) {
        const portfolio = await Portfolio.findOne({ _id: body.portfolioId, userId: user._id });

        if (!portfolio) {
          throw new AppError(403, "You can only upload a video to your own portfolio.");
        }
      }

      return createVideoUploadSignature();
    }
  );

  ok(res, { message: "Cloudinary upload signature ready.", ...signed });
}

/** POST /video — small video through the server to Cloudinary. */
export async function uploadVideo(req: Request, res: Response): Promise<void> {
  const file = req.file;

  if (!file) {
    throw new AppError(400, "No video was uploaded.");
  }

  const result = await uploadToCloudinary(file, false, "Video upload failed.");

  ok(
    res,
    {
      message: "Video uploaded successfully.",
      file: {
        name: file.originalname,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        size: result.bytes,
        storage: "cloudinary",
      },
    },
    201
  );
}

/** POST / — document or image to Cloudinary. Videos must use /video. */
export async function uploadFile(req: Request, res: Response): Promise<void> {
  const file = req.file;

  if (!file) {
    throw new AppError(400, "No file was uploaded.");
  }

  if (isVideo(file)) {
    throw new AppError(400, "Upload videos to /api/uploads/video.");
  }

  // Multipart fields are strings: only the exact text "true" protects the file.
  const isProtectedDocument = (req.body as { protected?: unknown } | undefined)?.protected === "true";
  const result = await uploadToCloudinary(file, isProtectedDocument);

  ok(res, {
    message: "File uploaded successfully.",
    file: {
      name: file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      mimeType: file.mimetype,
      size: result.bytes,
      protected: isProtectedDocument,
      isVideo: false,
      storage: "cloudinary",
    },
  });
}
