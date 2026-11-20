import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import {
  completeVideo,
  getVideoConfig,
  initVideo,
  signVideoUpload,
  uploadFile,
  uploadVideo,
} from "./controller";
import { singleUploadFile, singleVideoFile } from "./multer";

const router = Router();

router.get("/video/config", getVideoConfig);
router.post("/video/init", authenticateUser, asyncHandler(initVideo));
router.post("/video/complete", authenticateUser, asyncHandler(completeVideo));
router.post("/video-signature", authenticateUser, asyncHandler(signVideoUpload));
router.post("/video", authenticateUser, singleVideoFile, asyncHandler(uploadVideo));
router.post("/", authenticateUser, singleUploadFile, asyncHandler(uploadFile));

export default router;
