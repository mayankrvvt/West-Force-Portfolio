import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { getOneJob, hideJob, listJobs, listJobsForMe, unhideJob } from "./controller";

// Mounted at /api/jobs. Free for every signed-in user.
const router = Router();

router.get("/", authenticateUser, asyncHandler(listJobs));
router.get("/for-me", authenticateUser, asyncHandler(listJobsForMe));
router.get("/:id", authenticateUser, asyncHandler(getOneJob));
router.post("/:id/hide", authenticateUser, asyncHandler(hideJob));
router.delete("/:id/hide", authenticateUser, asyncHandler(unhideJob));

export default router;
