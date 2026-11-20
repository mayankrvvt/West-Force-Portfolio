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
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    sendError(req, res, 401, "Authorization header is required.");
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    sendError(req, res, 401, "Invalid authorization format.");
    return;
  }

  const token = authHeader.split("Bearer ")[1];

  if (!token) {
    sendError(req, res, 401, "Authentication token is missing.");
    return;
  }

  let decoded: DecodedIdToken;

  try {
    decoded = await auth.verifyIdToken(token);
  } catch (error) {
    (req.log ?? logger).warn(
      { reason: error instanceof Error ? error.message : String(error) },
      "Authentication error"
    );
    sendError(req, res, 401, "Invalid or expired authentication token.");
    return;
  }

  req.user = decoded;
  next();
}

/** req.user after authenticateUser has run. */
export function currentUser(req: Request): DecodedIdToken {
  if (!req.user) {
    throw new AppError(401, "Authorization header is required.");
  }
  return req.user;
}

export default authenticateUser;
