import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { passwordResetLimiter, verificationEmailLimiter } from "../../middleware/rateLimit";
import { confirmEmailVerified, requestPasswordReset, sendVerification } from "./controller";

// Branded account emails, sent by us through Resend instead of Firebase's templates.
const router = Router();

// Sync handler: Express passes a thrown validation error to the error handler.
router.post("/password-reset", passwordResetLimiter, requestPasswordReset);
router.post("/send-verification", authenticateUser, verificationEmailLimiter, asyncHandler(sendVerification));
router.post("/email-verified", authenticateUser, asyncHandler(confirmEmailVerified));

export default router;
