import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "../lib/clients/firebase";
import { AppError, sendError } from "../lib/errors";
import { logger } from "../lib/logger";

/**
 * Verify the Firebase ID token in "Authorization: Bearer <token>" and set req.user.
 *
 * It answers 401 itself and never calls next(error): legacy routes chain it by
 * hand as authenticateUser(req, res, () => nextStep()), where an error passed
 * to that callback would be ignored and let the request through.
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const result = await verifyBearerToken(req);

  if ("error" in result) {
    sendError(req, res, 401, result.error);
    return;
  }

  req.user = result.user;
  next();
}

/**
 * Check "Authorization: Bearer <token>" without answering. Gives the decoded
 * user, or the 401 message authenticateUser would send. Never throws.
 */
export async function verifyBearerToken(
  req: Request
): Promise<{ user: DecodedIdToken } | { error: string }> {
  const authHeader = req.headers.authorization;

  if (!authHeader) return { error: "Authorization header is required." };

  if (!authHeader.startsWith("Bearer ")) return { error: "Invalid authorization format." };

  const token = authHeader.split("Bearer ")[1];

  if (!token) return { error: "Authentication token is missing." };

  try {
    return { user: await auth.verifyIdToken(token) };
  } catch (error) {
    (req.log ?? logger).warn(
      { reason: error instanceof Error ? error.message : String(error) },
      "Authentication error"
    );
    return { error: "Invalid or expired authentication token." };
  }
}

/** req.user after authenticateUser has run. */
export function currentUser(req: Request): DecodedIdToken {
  if (!req.user) {
    throw new AppError(401, "Authorization header is required.");
  }
  return req.user;
}

export default authenticateUser;
