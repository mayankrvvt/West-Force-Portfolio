import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import {
  downloadDocument,
  downloadResume,
  getMyDocuments,
  unlock,
  updateDocumentProtection,
} from "./controller";

// Mounted at /api/portfolios, next to the portfolio routes.
const router = Router();

router.get("/me/documents", authenticateUser, asyncHandler(getMyDocuments));
router.put("/me/document-protection", authenticateUser, asyncHandler(updateDocumentProtection));
router.post("/:slug/unlock-documents", asyncHandler(unlock));
router.get("/:slug/documents/:documentId", asyncHandler(downloadDocument));
router.get("/:slug/resume", asyncHandler(downloadResume));

export default router;
