import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import {
  getApplications,
  patchApplication,
  patchApplicationStatus,
  postApplication,
  removeApplication,
} from "./controller";

// Mounted at /api/applications. Free for every signed-in user; owner-only.
const router = Router();

router.get("/", authenticateUser, asyncHandler(getApplications));
router.post("/", authenticateUser, asyncHandler(postApplication));
router.patch("/:id/status", authenticateUser, asyncHandler(patchApplicationStatus));
router.patch("/:id", authenticateUser, asyncHandler(patchApplication));
router.delete("/:id", authenticateUser, asyncHandler(removeApplication));

export default router;
