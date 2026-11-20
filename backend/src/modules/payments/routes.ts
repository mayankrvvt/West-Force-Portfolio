import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { checkout, confirm, getPaymentStatus } from "./controller";

// The webhook is not here: app.ts mounts handleStripeWebhook with a raw body parser.
const router = Router();

router.get("/me", authenticateUser, asyncHandler(getPaymentStatus));
router.post("/confirm", authenticateUser, asyncHandler(confirm));
router.post("/checkout", authenticateUser, asyncHandler(checkout));

export default router;
