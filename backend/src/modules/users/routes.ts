import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import {
  createUser,
  getMe,
  getMyJobPreferences,
  updateMe,
  updateMyJobPreferences,
} from "./controller";

const router = Router();

router.get("/me", authenticateUser, asyncHandler(getMe));
router.get("/me/job-preferences", authenticateUser, asyncHandler(getMyJobPreferences));
router.put("/me/job-preferences", authenticateUser, asyncHandler(updateMyJobPreferences));
router.post("/", authenticateUser, asyncHandler(createUser));
router.put("/me", authenticateUser, asyncHandler(updateMe));

export default router;
