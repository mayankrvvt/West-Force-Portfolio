import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { getMyInsights, recordView } from "./controller";

/** One page load sends one beacon; 30 a minute per IP leaves room for reloads. */
export const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Mounted at /api/insights.
const router = Router();

router.post("/portfolios/:slug/view", viewLimiter, asyncHandler(recordView));
router.get("/me", authenticateUser, asyncHandler(getMyInsights));

export default router;
