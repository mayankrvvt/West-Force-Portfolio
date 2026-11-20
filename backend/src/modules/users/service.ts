import type { DecodedIdToken } from "firebase-admin/auth";
import { AppError } from "../../lib/errors";
import User, { type UserDocument } from "./model";
import type { CreateUserBody, UpdateUserBody } from "./schema";

export function findUserByUid(firebaseUid: string): Promise<UserDocument | null> {
  return User.findOne({ firebaseUid });
}

/**
 * Find the Mongo user for this Firebase account, or create it.
 * Body values win; empty ones fall back to the token (same `||` rule as before).
 */
export async function findOrCreateUser(
  token: DecodedIdToken,
  body: CreateUserBody
): Promise<{ user: UserDocument; created: boolean }> {
  const firebaseUid = token.uid;
  const email = body.email || token.email || "";
  const displayName = body.displayName || (token.name as string | undefined) || "";
  const photoURL = body.photoURL || token.picture || "";

  if (!firebaseUid) {
    throw new AppError(400, "Firebase UID is missing.");
  }

  if (!email) {
    throw new AppError(400, "User email is required.");
  }

  const existing = await User.findOne({ firebaseUid });

  if (existing) {
    return { user: existing, created: false };
  }

  const user = await User.create({ firebaseUid, email, displayName, photoURL });
  return { user, created: true };
}

export function updateUser(
  firebaseUid: string,
  body: UpdateUserBody
): Promise<UserDocument | null> {
  const updates: Record<string, unknown> = {};

  if (body.displayName !== undefined) {
    updates.displayName = body.displayName;
  }

  if (body.photoURL !== undefined) {
    updates.photoURL = body.photoURL;
  }

  return User.findOneAndUpdate(
    { firebaseUid },
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  );
}
