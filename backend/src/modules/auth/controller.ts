import type { Request, Response } from "express";
import { z } from "zod";
import { auth } from "../../lib/clients/firebase";
import { AppError, failWith } from "../../lib/errors";
import { mailReaches, mailSettings } from "../../lib/mail";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { takeResetEmailSlot } from "./resetLimit";
import { recordVerifiedEmail, sendPasswordResetEmail, sendVerificationEmail } from "./service";

const orEmpty = (value: unknown) => (value === undefined ? {} : value);

const passwordResetBody = z.preprocess(
  orEmpty,
  z.object({
    email: z
      .string({ error: "Enter your email address." })
      .trim()
      .toLowerCase()
      .max(254, { error: "Enter a valid email address." })
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { error: "Enter a valid email address." }),
  })
);

/** The one answer for every valid reset request, so nobody can tell which emails have accounts. */
export const PASSWORD_RESET_MESSAGE =
  "If an account uses that email, we sent a link to reset the password.";

const reason = (error: unknown) => (error instanceof Error ? error.name : "unknown");

/**
 * How an account email goes out. Until mail is live (MAIL_MODE=live with a
 * key and a sender) the frontend sends it with Firebase's own client call
 * instead.
 */
const DELIVERED = { delivered: true, fallback: null } as const;
const USE_FIREBASE = { delivered: false, fallback: "firebase" } as const;

/**
 * POST /api/auth/password-reset (public). Answers at once with the same 200
 * whether or not the account exists; the email is built and sent after the
 * answer, so the reply time does not give it away either. The answer depends
 * only on whether mail is live, never on the address: MAIL_ALLOWLIST and the
 * per address limit only decide, silently, whether an email really goes out.
 */
export function requestPasswordReset(req: Request, res: Response): void {
  const { email } = parse(passwordResetBody, req.body);

  if (mailSettings().mode !== "live") {
    ok(res, { message: PASSWORD_RESET_MESSAGE, ...USE_FIREBASE });
    return;
  }

  if (mailReaches(email) && takeResetEmailSlot(email)) {
    sendPasswordResetEmail(email).catch((error: unknown) => {
      req.log.error({ reason: reason(error) }, "Password reset email failed");
    });
  }

  ok(res, { message: PASSWORD_RESET_MESSAGE, ...DELIVERED });
}

/** POST /api/auth/send-verification (signed in): email a branded verification link. */
export async function sendVerification(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);

  if (!user.email) throw new AppError(400, "Your account has no email address to verify.");

  if (user.email_verified) {
    ok(res, { message: "Your email is already verified.", alreadyVerified: true });
    return;
  }

  if (!mailReaches(user.email)) {
    ok(res, { message: "Send the verification email from this device.", alreadyVerified: false, ...USE_FIREBASE });
    return;
  }

  await failWith("We could not send the verification email. Please try again.", () =>
    sendVerificationEmail(user.email as string, typeof user.name === "string" ? user.name : undefined)
  );

  ok(res, { message: "Verification email sent. Check your inbox.", alreadyVerified: false, ...DELIVERED });
}

/**
 * POST /api/auth/email-verified (signed in): the /auth/action page calls this
 * after a verify link worked. Checks Firebase itself (not the token, which
 * may be older), stores the flag and sends the welcome email once.
 */
export async function confirmEmailVerified(req: Request, res: Response): Promise<void> {
  const { uid } = currentUser(req);

  const record = await failWith("Could not check your email.", () => auth.getUser(uid));

  if (!record.emailVerified) {
    ok(res, { verified: false });
    return;
  }

  await recordVerifiedEmail(uid).catch((error: unknown) => {
    req.log.error({ reason: reason(error) }, "Welcome email failed");
  });

  ok(res, { verified: true });
}
