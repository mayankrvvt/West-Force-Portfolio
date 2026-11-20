import type { NextFunction, Request, Response } from "express";
import { sendError } from "../lib/errors";
import { isAdmin, isOwner } from "../modules/admin/admins.service";
import { currentUser } from "./auth";

export { isAdmin, isOwner };

/**
 * Allow only admins (an owner in ADMIN_EMAILS or an admin added in the
 * portal, with a verified email); otherwise answer 403 "Admins only.". Run
 * after authenticateUser. Like requirePaidUser it answers the 403 itself.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  let allowed: boolean;

  try {
    allowed = await isAdmin(currentUser(req));
  } catch (error) {
    return next(error);
  }

  if (!allowed) {
    sendError(req, res, 403, "Admins only.");
    return;
  }

  next();
}

/** Allow only owners; otherwise 403. Run after requireAdmin. */
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!isOwner(currentUser(req))) {
      sendError(req, res, 403, "Only owners can change admins.", "OWNERS_ONLY");
      return;
    }
  } catch (error) {
    return next(error);
  }

  next();
}
