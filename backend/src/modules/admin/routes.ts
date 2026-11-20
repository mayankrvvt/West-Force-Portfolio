import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { adminWriteLimiter } from "../../middleware/rateLimit";
import { requireAdmin, requireOwner } from "../../middleware/requireAdmin";
import {
  createJob,
  deleteAdmin,
  deleteJob,
  getActivity,
  getAdmins,
  getAdminStatus,
  getSettings,
  listJobs,
  patchSettings,
  postAdmin,
  updateJob,
} from "./controller";

// Mounted at /api/admin. /me is for any signed-in user; the rest is admins only
// (an owner in ADMIN_EMAILS or an admin added here, with a verified email).
// Adding and removing admins is for owners only. Every write is logged.
// Only manual jobs can be changed here.
const router = Router();
const admin = [authenticateUser, requireAdmin];
const adminWrite = [...admin, adminWriteLimiter];

router.get("/me", authenticateUser, asyncHandler(getAdminStatus));

router.get("/jobs", ...admin, asyncHandler(listJobs));
router.post("/jobs", ...adminWrite, asyncHandler(createJob));
router.patch("/jobs/:id", ...adminWrite, asyncHandler(updateJob));
router.delete("/jobs/:id", ...adminWrite, asyncHandler(deleteJob));

router.get("/admins", ...admin, asyncHandler(getAdmins));
router.post("/admins", ...admin, requireOwner, adminWriteLimiter, asyncHandler(postAdmin));
router.delete("/admins/:email", ...admin, requireOwner, adminWriteLimiter, asyncHandler(deleteAdmin));

router.get("/settings", ...admin, asyncHandler(getSettings));
router.patch("/settings", ...adminWrite, asyncHandler(patchSettings));

router.get("/activity", ...admin, asyncHandler(getActivity));

export default router;
