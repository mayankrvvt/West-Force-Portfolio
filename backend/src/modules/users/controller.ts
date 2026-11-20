import type { Request, Response } from "express";
import { currentUser } from "../../middleware/auth";
import { AppError, failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { createUserBody, jobPreferencesBody, updateUserBody } from "./schema";
import { findOrCreateUser, findUserByUid, updateJobPreferences, updateUser } from "./service";
import { recordVerifiedEmail } from "../auth/service";

const userNotFound = () => new AppError(404, "User not found.");

/** Background: never slows or fails the request. Logs no address or link. */
function syncVerifiedEmail(req: Request, firebaseUid: string): void {
  recordVerifiedEmail(firebaseUid).catch((error: unknown) => {
    req.log.error({ reason: error instanceof Error ? error.message : "unknown" }, "Verified email sync or welcome email failed");
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await failWith("Failed to get user.", () =>
    findUserByUid(currentUser(req).uid)
  );

  if (!user) throw userNotFound();

  ok(res, { user });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const token = currentUser(req);
  const body = parse(createUserBody, req.body);

  const { user, created } = await failWith("Failed to create user.", () =>
    findOrCreateUser(token, body)
  );

  req.log.info({ userId: user.id, created }, "User create/find");

  // Sign in sends a fresh token: copy "email verified" and welcome new users once.
  if (token.email_verified) syncVerifiedEmail(req, token.uid);

  if (created) {
    ok(res, { message: "User created successfully.", user }, 201);
  } else {
    ok(res, { message: "User already exists.", user });
  }
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const token = currentUser(req);
  const body = parse(updateUserBody, req.body);

  const user = await failWith("Failed to update user.", () =>
    updateUser(token.uid, body)
  );

  if (!user) throw userNotFound();

  ok(res, { message: "User updated successfully.", user });
}

export async function getMyJobPreferences(req: Request, res: Response): Promise<void> {
  const user = await failWith("Failed to get job preferences.", () =>
    findUserByUid(currentUser(req).uid)
  );

  if (!user) throw userNotFound();

  ok(res, { jobPreferences: user.jobPreferences });
}

export async function updateMyJobPreferences(req: Request, res: Response): Promise<void> {
  const token = currentUser(req);
  const body = parse(jobPreferencesBody, req.body);

  const user = await failWith("Failed to update job preferences.", () =>
    updateJobPreferences(token.uid, body)
  );

  if (!user) throw userNotFound();

  // The weekly email only goes to verified addresses; keep the flag current.
  if (body.weeklyEmail && token.email_verified && !user.emailVerified) syncVerifiedEmail(req, token.uid);

  ok(res, { message: "Job preferences saved.", jobPreferences: user.jobPreferences });
}
