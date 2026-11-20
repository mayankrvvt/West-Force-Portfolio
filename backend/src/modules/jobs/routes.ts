import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { getOneJob, listJobs } from "./controller";

// Mounted at /api/jobs. Free for every signed-in user.
const router = Router();

router.get("/", authenticateUser, asyncHandler(listJobs));
router.get("/:id", authenticateUser, asyncHandler(getOneJob));

export default router;
