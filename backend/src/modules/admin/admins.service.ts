import type { DecodedIdToken } from "firebase-admin/auth";
import { adminEmails } from "../../lib/config";
import { isDbReady } from "../../lib/db";
import { AppError } from "../../lib/errors";
import AdminUser from "./admins.model";

type TokenEmail = Pick<DecodedIdToken, "email" | "email_verified">;

export type AdminEntry = {
  email: string;
  owner: boolean;
  addedBy: string | null;
  createdAt: Date | null;
};

/** The database admin list is read at most this often per server. */
export const ADMIN_CACHE_MS = 30 * 1000;

let cache: { emails: Set<string>; expires: number } | null = null;

/** Forget the cached list, so the next check reads the database. */
export function clearAdminCache(): void {
  cache = null;
}

/** Emails of the admins added in the portal (cached ~30 s). No database: none. */
async function databaseAdminEmails(): Promise<Set<string>> {
  if (cache && cache.expires > Date.now()) return cache.emails;
  if (!isDbReady()) return new Set();

  const rows = await AdminUser.find().select("email").lean();
  const emails = new Set(rows.map((row) => row.email));
  cache = { emails, expires: Date.now() + ADMIN_CACHE_MS };
  return emails;
}

/** The token's email, trimmed and lower case, only when it is verified. */
function verifiedEmail(token: TokenEmail): string | null {
  if (token.email_verified !== true || typeof token.email !== "string") return null;
  return token.email.trim().toLowerCase() || null;
}

/** A verified email in ADMIN_EMAILS. Owners can't be removed through the API. */
export function isOwner(token: TokenEmail): boolean {
  const email = verifiedEmail(token);
  return email !== null && adminEmails().has(email);
}

/** A verified email that is an owner or an admin added in the portal. */
export async function isAdmin(token: TokenEmail): Promise<boolean> {
  const email = verifiedEmail(token);
  if (email === null) return false;
  if (adminEmails().has(email)) return true;
  return (await databaseAdminEmails()).has(email);
}

/**
 * True only when the token's email is on the admin list (owner or portal
 * admin) but Firebase has not verified it yet, so the UI can say "verify
 * your email". Anyone else gets false, so nothing leaks about the list.
 */
export async function needsAdminVerification(token: TokenEmail): Promise<boolean> {
  if (token.email_verified === true || typeof token.email !== "string") return false;
  const email = token.email.trim().toLowerCase();
  if (!email) return false;
  if (adminEmails().has(email)) return true;
  return (await databaseAdminEmails()).has(email);
}

/** Owners first (env order), then portal admins, oldest first. */
export async function listAdmins(): Promise<AdminEntry[]> {
  const owners = [...adminEmails()];
  const rows = await AdminUser.find().sort({ createdAt: 1, _id: 1 }).lean();

  return [
    ...owners.map((email) => ({ email, owner: true, addedBy: null, createdAt: null })),
    ...rows
      .filter((row) => !owners.includes(row.email))
      .map((row) => ({ email: row.email, owner: false, addedBy: row.addedBy || null, createdAt: row.createdAt ?? null })),
  ];
}

const DUPLICATE_KEY = 11000;

export async function addAdmin(email: string, addedBy: string): Promise<AdminEntry> {
  if (adminEmails().has(email)) {
    throw new AppError(409, "That person is already an owner.", { code: "ALREADY_ADMIN" });
  }

  try {
    const row = await AdminUser.create({ email, addedBy });
    return { email: row.email, owner: false, addedBy: row.addedBy || null, createdAt: row.createdAt ?? null };
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === DUPLICATE_KEY) {
      throw new AppError(409, "That person is already an admin.", { code: "ALREADY_ADMIN" });
    }
    throw error;
  } finally {
    clearAdminCache();
  }
}

export async function removeAdmin(email: string): Promise<void> {
  if (adminEmails().has(email)) {
    throw new AppError(400, "Owners are set on the server and can't be removed here.", { code: "OWNER" });
  }

  const deleted = await AdminUser.findOneAndDelete({ email });
  clearAdminCache();

  if (!deleted) throw new AppError(404, "Admin not found.");
}
