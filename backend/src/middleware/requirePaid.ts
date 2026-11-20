import type { NextFunction, Request, Response } from "express";
import { sendError } from "../lib/errors";
import { findUserEntitlement } from "../modules/payments/service";
import { currentUser } from "./auth";

/**
 * Allow only users with a paid plan; otherwise answer 402 PAYMENT_REQUIRED.
 * Run after authenticateUser. Like authenticateUser it answers the 402 itself
 * (legacy routes call it by hand); only unexpected errors go to next(error).
 */
export async function requirePaidUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const entitlement = await findUserEntitlement(currentUser(req));

    if (!entitlement) {
      sendError(
        req,
        res,
        402,
        "Choose a plan to unlock this feature.",
        "PAYMENT_REQUIRED"
      );
      return;
    }

    req.entitlement = entitlement;
  } catch (error) {
    return next(error);
  }

  next();
}

export { findUserEntitlement };
