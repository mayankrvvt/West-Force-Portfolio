import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import {
  createMyPortfolio,
  deleteMyPortfolio,
  getMyPortfolio,
  getPublicPortfolio,
  requirePaymentToPublish,
  updateMyPortfolio,
} from "./controller";

// Mounted at /api/portfolios. The PIN / document routes on the same prefix
// live in src/modules/documents.
const router = Router();

router.get("/me", authenticateUser, asyncHandler(getMyPortfolio));
router.post("/", authenticateUser, requirePaymentToPublish, asyncHandler(createMyPortfolio));
router.put("/me", authenticateUser, requirePaymentToPublish, asyncHandler(updateMyPortfolio));
router.delete("/me", authenticateUser, asyncHandler(deleteMyPortfolio));
router.get("/:slug", asyncHandler(getPublicPortfolio));

export default router;
