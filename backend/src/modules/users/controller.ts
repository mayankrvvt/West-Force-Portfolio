import type { Request, Response } from "express";
import { currentUser } from "../../middleware/auth";
import { AppError, failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { createUserBody, updateUserBody } from "./schema";
import { findOrCreateUser, findUserByUid, updateUser } from "./service";

const userNotFound = () => new AppError(404, "User not found.");

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
