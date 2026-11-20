import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { getSiteStatus } from "./controller";

// Mounted at /api/site. Public: it still answers during maintenance.
const router = Router();

router.get("/status", asyncHandler(getSiteStatus));

export default router;
