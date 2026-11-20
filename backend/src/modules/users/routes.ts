import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { authenticateUser } from "../../middleware/auth";
import { createUser, getMe, updateMe } from "./controller";

const router = Router();

router.get("/me", authenticateUser, asyncHandler(getMe));
router.post("/", authenticateUser, asyncHandler(createUser));
router.put("/me", authenticateUser, asyncHandler(updateMe));

export default router;
