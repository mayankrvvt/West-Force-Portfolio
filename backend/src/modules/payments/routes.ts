import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { requireFeature } from "../../middleware/siteGuards";
import { checkout, confirm, getPaymentStatus } from "./controller";

// The webhook is not here: app.ts mounts handleStripeWebhook with a raw body parser.
const router = Router();

router.get("/me", authenticateUser, asyncHandler(getPaymentStatus));
router.post("/confirm", authenticateUser, asyncHandler(confirm));
// The "payments" switch only stops new checkouts; the webhook keeps working.
router.post("/checkout", requireFeature("payments"), authenticateUser, asyncHandler(checkout));

export default router;
