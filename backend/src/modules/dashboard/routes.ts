import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { getSummary } from "./controller";

// Mounted at /api/dashboard. Free for every signed-in user.
const router = Router();

router.get("/summary", authenticateUser, asyncHandler(getSummary));

export default router;
