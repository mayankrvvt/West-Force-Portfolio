import type { DecodedIdToken } from "firebase-admin/auth";
import { AppError } from "../../lib/errors";
import { isFeatureOn } from "../site/service";
import User, { type UserDocument } from "./model";
import type { CreateUserBody, JobPreferencesBody, UpdateUserBody } from "./schema";

export function findUserByUid(firebaseUid: string): Promise<UserDocument | null> {
  return User.findOne({ firebaseUid });
}

/**
 * Find the Mongo user for this Firebase account, or create it.
 * The email always comes from the token, never the body, so nobody can store
 * an address they do not own. For name and photo, body values win and empty
 * ones fall back to the token.
 */
export async function findOrCreateUser(
  token: DecodedIdToken,
  body: CreateUserBody
): Promise<{ user: UserDocument; created: boolean }> {
  const firebaseUid = token.uid;
  const email = token.email || "";
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

  // The admin "signups" switch blocks only new accounts; existing users go on.
  if (!(await isFeatureOn("signups"))) {
    throw new AppError(403, "New sign ups are closed right now. Please try again later.", { code: "SIGNUPS_OFF" });
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

/** Merge the sent job preference fields (dotted $set paths, so the others stay). */
export function updateJobPreferences(
  firebaseUid: string,
  body: JobPreferencesBody
): Promise<UserDocument | null> {
  const updates: Record<string, unknown> = {};

  for (const key of ["titles", "city", "province", "remoteOk", "weeklyEmail"] as const) {
    if (body[key] !== undefined) updates[`jobPreferences.${key}`] = body[key];
  }

  return User.findOneAndUpdate(
    { firebaseUid },
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  );
}
