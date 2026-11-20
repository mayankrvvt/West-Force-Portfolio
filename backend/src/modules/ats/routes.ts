import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { requirePaidUser } from "../../middleware/requirePaid";
import { check } from "./controller";
import { atsDailyLimit } from "./limits";

// Mounted at /api/ats. Paid plans only, 20 checks per user per day.
const router = Router();

router.post("/check", authenticateUser, requirePaidUser, atsDailyLimit, asyncHandler(check));

export default router;
