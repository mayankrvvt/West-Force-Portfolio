import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { requirePaidUser } from "../../middleware/requirePaid";
import { requireFeature } from "../../middleware/siteGuards";
import { saveTailored, tailor } from "./tailor.controller";
import { resumeTailorDailyLimit } from "./tailor.limits";

// Mounted at /api/resumes, before the main resume routes. Paid users only.
const paid = [authenticateUser, requirePaidUser];

const router = Router();

// The AI call costs money: a daily cap per user, given back when the call fails.
router.post("/tailor", requireFeature("ai"), ...paid, resumeTailorDailyLimit, asyncHandler(tailor));
router.post("/tailor/save", ...paid, asyncHandler(saveTailored));

export default router;
