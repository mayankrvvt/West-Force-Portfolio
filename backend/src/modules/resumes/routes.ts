import { Router, type RequestHandler } from "express";
import multer from "multer";
import { AppError, asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { requirePaidUser } from "../../middleware/requirePaid";
import { build, enhance, extractText, getOneResume, getResumes, remove, save } from "./controller";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function resumeUpload(allowedTypes: string[], typeMessage: string) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!allowedTypes.includes(file.mimetype)) {
        cb(new AppError(400, typeMessage));
        return;
      }
      cb(null, true);
    },
  }).single("file");
}

/** Run a multer upload and turn its errors into AppErrors with the given size status. */
function withUpload(upload: RequestHandler, tooLarge: AppError): RequestHandler {
  return (req, res, next) => {
    upload(req, res, (error?: unknown) => {
      if (!error) return next();
      if (error instanceof AppError) return next(error);

      if (error instanceof multer.MulterError) {
        return next(error.code === "LIMIT_FILE_SIZE" ? tooLarge : new AppError(400, error.message));
      }

      next(new AppError(400, "Could not upload the resume.", { cause: error }));
    });
  };
}

const atsUpload = withUpload(
  resumeUpload(
    [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    "Upload a PDF, DOCX, or TXT resume for ATS analysis."
  ),
  new AppError(413, "File too large")
);

const enhanceUpload = withUpload(
  resumeUpload(
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    "Unsupported resume file type. Please upload a PDF, DOC, or DOCX file."
  ),
  new AppError(400, "Resume file is too large. Maximum size is 10 MB.")
);

const paid = [authenticateUser, requirePaidUser];

const router = Router();

router.post("/extract-text", authenticateUser, atsUpload, asyncHandler(extractText));
router.get("/", ...paid, asyncHandler(getResumes));
router.get("/:id", ...paid, asyncHandler(getOneResume));
router.post("/build", ...paid, asyncHandler(build));
router.post("/enhance", ...paid, enhanceUpload, asyncHandler(enhance));
router.post("/", ...paid, asyncHandler(save));
router.delete("/:id", ...paid, asyncHandler(remove));

export default router;
