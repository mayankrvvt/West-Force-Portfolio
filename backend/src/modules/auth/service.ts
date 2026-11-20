import type { ActionCodeSettings } from "firebase-admin/auth";
import { auth } from "../../lib/clients/firebase";
import { logger } from "../../lib/logger";
import { mailReaches, passwordResetEmail, sendMail, siteUrl, verificationEmail, welcomeEmail } from "../../lib/mail";
import User from "../users/model";

/** Firebase errors that mean "no account we may email". Silent, so nobody learns which emails exist. */
const NO_ACCOUNT_CODES = new Set(["auth/email-not-found", "auth/user-not-found", "auth/user-disabled"]);

/** Accounts older than this never get the welcome email (they are not new). */
export const WELCOME_MAX_AGE_DAYS = 14;

export function firebaseCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "";
}

/** Where Firebase sends people after the action (its domain must be authorized in Firebase). */
function actionCodeSettings(): ActionCodeSettings {
  return { url: `${siteUrl()}/auth/sign-in` };
}

/**
 * Firebase links open its own hosted page. Point them at our branded
 * /auth/action page instead, keeping only the mode and the one time code.
 */
export function appActionLink(firebaseLink: string): string {
  const source = new URL(firebaseLink);
  const mode = source.searchParams.get("mode");
  const oobCode = source.searchParams.get("oobCode");

  if (!mode || !oobCode) throw new Error("Firebase action link has no mode or code.");

  const link = new URL("/auth/action", `${siteUrl()}/`);
  link.searchParams.set("mode", mode);
  link.searchParams.set("oobCode", oobCode);
  return link.toString();
}

/** Email a verification link to a signed in user's address. */
export async function sendVerificationEmail(email: string, name?: string): Promise<void> {
  const firebaseLink = await auth.generateEmailVerificationLink(email, actionCodeSettings());
  await sendMail({ to: email, ...verificationEmail(appActionLink(firebaseLink), name) });
}

/**
 * Email a password reset link when the account exists. Unknown or disabled
 * accounts are skipped quietly. Other errors are thrown for the caller to log.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  let firebaseLink: string;

  try {
    firebaseLink = await auth.generatePasswordResetLink(email, actionCodeSettings());
  } catch (error) {
    if (NO_ACCOUNT_CODES.has(firebaseCode(error))) {
      logger.info("Password reset asked for an email with no account; nothing sent");
      return;
    }
    throw error;
  }

  await sendMail({ to: email, ...passwordResetEmail(appActionLink(firebaseLink)) });
}

/**
 * Call when Firebase says this user's email is verified. Stores
 * emailVerified (the weekly job email needs it) and sends the welcome email
 * once: welcomeSentAt is claimed first, so two calls at once send one email.
 * Accounts older than WELCOME_MAX_AGE_DAYS are not welcomed, and nothing is
 * claimed while mail is not live (Firebase sends no welcome email either).
 * The address comes from the Firebase Auth record (never the stored email),
 * and nothing is sent unless Firebase says that address is verified.
 * Returns true when a welcome email was sent.
 */
export async function recordVerifiedEmail(firebaseUid: string, now = new Date()): Promise<boolean> {
  await User.updateOne({ firebaseUid, emailVerified: { $ne: true } }, { $set: { emailVerified: true } });

  const newSince = new Date(now.getTime() - WELCOME_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const unwelcomed = { firebaseUid, welcomeSentAt: null, createdAt: { $gte: newSince } };

  // Most calls stop here, so Firebase is only asked when a welcome is due.
  const candidate = await User.exists(unwelcomed);
  if (!candidate) return false;

  const account = await auth.getUser(firebaseUid);
  if (!account.email || !account.emailVerified) {
    logger.info("Welcome email skipped: Firebase has no verified email for this account");
    return false;
  }

  // Without live mail, skip and leave welcomeSentAt empty so it can go out later.
  if (!mailReaches(account.email)) {
    logger.info("Welcome email skipped: mail is not live for this address");
    return false;
  }

  const user = await User.findOneAndUpdate(unwelcomed, { $set: { welcomeSentAt: now } }, { returnDocument: "after" });

  if (!user) return false;

  try {
    await sendMail({ to: account.email, ...welcomeEmail(user.displayName) });
    return true;
  } catch (error) {
    // Free the claim so the next sign in tries again.
    await User.updateOne({ _id: user._id }, { $set: { welcomeSentAt: null } });
    throw error;
  }
}
