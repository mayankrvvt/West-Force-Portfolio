import type { DecodedIdToken } from "firebase-admin/auth";
import type { EntitlementDocument } from "../modules/payments/model";

declare global {
  namespace Express {
    interface Request {
      /** Set by authenticateUser. */
      user?: DecodedIdToken;
      /** Set by requirePaidUser. */
      entitlement?: EntitlementDocument;
    }
  }
}

export {};
