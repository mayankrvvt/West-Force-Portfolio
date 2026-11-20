import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { postChat, resolveAccess } from "./controller";

// GET /api/chat/health is served in app.ts.
const router = Router();

router.post("/", resolveAccess, asyncHandler(postChat));

export default router;
