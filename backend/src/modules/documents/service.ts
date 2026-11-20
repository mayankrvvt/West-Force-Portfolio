import crypto from "node:crypto";
import path from "node:path";
import cloudinary from "../../lib/clients/cloudinary";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import Portfolio from "../portfolios/model";
import { findOwner, findOwnPortfolio, protectionFor } from "../portfolios/service";
import { getDocumentDownloadDetails, type DownloadDetails } from "./documentDownload";
import PinAttempt, { type PinAttemptCounter } from "./model";
import {
  PIN_HASH_V1,
  UNLOCK_PIN_PATTERN,
  documentAccessSecret,
  newPinProtection,
  pinHashVersionOf,
  verifyPin,
} from "./pin";
import type { ProtectionBody } from "./schema";

export const DOCUMENT_COOKIE_PREFIX = "westforce_document_access_";
export const ACCESS_DURATION_MS = 15 * 60 * 1000;

// Per client IP, per portfolio: 5 tries per 15 minutes.
const PIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const MAX_PIN_ATTEMPTS = 5;

// Per portfolio, across all IPs: 30 failed tries per 60 minutes, then
// everyone is locked out (also the right PIN). Kept high so one person
// cannot easily lock real viewers out; it does not depend on IP.
const PORTFOLIO_PIN_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const MAX_PORTFOLIO_PIN_ATTEMPTS = 30;

/* ---------- access cookie ---------- */

function sign(payload: string): string {
  return crypto.createHmac("sha256", documentAccessSecret()).update(payload).digest("hex");
}

export function createAccessToken(slug: string, now = Date.now()): string {
  const expiresAt = now + ACCESS_DURATION_MS;
  return `${expiresAt}.${sign(`${slug}:${expiresAt}`)}`;
}

export function verifyAccessToken(slug: string, token: string | null): boolean {
  if (!token) return false;

  const parts = token.split(".");

  if (parts.length !== 2) return false;

  const expiresAt = Number(parts[0]);
  const signature = parts[1] ?? "";

  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(`${slug}:${expiresAt}`);

  return (
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;

  const target = header
    .split(";")
    .map((part) => part.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return target ? decodeURIComponent(target.substring(name.length + 1)) : null;
}

export function accessCookieName(slug: string): string {
  return `${DOCUMENT_COOKIE_PREFIX}${slug}`;
}

/* ---------- owner settings ---------- */

/** PUT /me/document-protection: turn protection off, or on with a new 6-digit PIN. */
export async function setDocumentProtection(
  firebaseUid: string,
  body: ProtectionBody
): Promise<{ enabled: boolean }> {
  const portfolio = await findOwnPortfolio(firebaseUid);
  const enabled = Boolean(body.enabled);

  const protection = await protectionFor(
    { enabled, pin: body.pin },
    { keepExisting: false, message: "PIN must contain exactly 6 digits." }
  );

  portfolio.set("documentProtection", protection);
  await portfolio.save();

  return { enabled };
}

/** The owner's documents, optionally only one type (case-insensitive). No portfolio = []. */
export async function listMyDocuments(firebaseUid: string, type?: string) {
  const user = await findOwner(firebaseUid);
  const portfolio = await Portfolio.findOne({ userId: user._id }).select("documents");
  const documents = portfolio?.documents ?? [];
  const wanted = type?.toLowerCase();

  return wanted
    ? documents.filter((document) => (document.type || "").toLowerCase() === wanted)
    : [...documents];
}

/* ---------- PIN unlock ---------- */

export type UnlockResult =
  | { kind: "not-protected" }
  | { kind: "locked"; retryAfter: number }
  | { kind: "wrong"; attemptsRemaining: number }
  | { kind: "unlocked"; token: string };

function retryAfterSeconds(attempt: PinAttemptCounter, now: Date): number {
  return Math.max(
    1,
    Math.ceil((new Date(attempt.expiresAt).getTime() - now.getTime()) / 1000)
  );
}

/**
 * After a correct legacy (v1) PIN, store it as v2. Only replaces the exact
 * hash that was checked, so a PIN changed meanwhile is never overwritten.
 * A failure is logged and does not block the unlock.
 */
async function upgradePinHash(
  portfolioId: unknown,
  oldHash: string,
  pin: string
): Promise<void> {
  try {
    const next = await newPinProtection(pin);

    await Portfolio.updateOne(
      { _id: portfolioId, "documentProtection.pinHash": oldHash },
      {
        $set: {
          "documentProtection.pinHash": next.pinHash,
          "documentProtection.pinHashVersion": next.pinHashVersion,
          "documentProtection.pinLength": next.pinLength,
        },
      }
    );
  } catch (error) {
    logger.warn({ err: error, portfolioId }, "PIN hash upgrade failed");
  }
}

/**
 * Check a viewer's PIN with two limits: per IP (5 / 15 min) and per
 * portfolio (30 / 60 min). A try is reserved (atomic) BEFORE the PIN is
 * checked, so parallel requests cannot slip past either limit.
 */
export async function unlockDocuments(
  slug: string,
  pin: string,
  ip: string | undefined,
  now: Date = new Date()
): Promise<UnlockResult> {
  if (!UNLOCK_PIN_PATTERN.test(pin)) {
    throw new AppError(400, "Enter a valid 4- or 6-digit PIN.");
  }

  const portfolio = await Portfolio.findOne({ slug, status: "published" }).select(
    "+documentProtection.pinHash"
  );

  if (!portfolio) throw new AppError(404, "Published portfolio not found.");

  const protection = portfolio.documentProtection;

  if (!protection?.enabled) return { kind: "not-protected" };

  // req.ip is the real client IP because app.ts sets "trust proxy".
  const ipKey = `ip:${ip || "unknown"}:${slug}`;
  const portfolioKey = `portfolio:${portfolio._id.toString()}`;

  // The per-IP limit runs first so tries it blocks do not count toward the portfolio lock.
  const ipAttempt = await PinAttempt.reserve(ipKey, PIN_ATTEMPT_WINDOW_MS, now);

  if (ipAttempt.count > MAX_PIN_ATTEMPTS) {
    return { kind: "locked", retryAfter: retryAfterSeconds(ipAttempt, now) };
  }

  const portfolioAttempt = await PinAttempt.reserve(
    portfolioKey,
    PORTFOLIO_PIN_ATTEMPT_WINDOW_MS,
    now
  );

  if (portfolioAttempt.count > MAX_PORTFOLIO_PIN_ATTEMPTS) {
    // The PIN was not checked, so this IP gets its try back.
    await PinAttempt.release(ipKey);
    return { kind: "locked", retryAfter: retryAfterSeconds(portfolioAttempt, now) };
  }

  const stored = {
    pinHash: protection.pinHash ?? "",
    pinHashVersion: protection.pinHashVersion ?? null,
  };

  if (!(await verifyPin(pin, stored))) {
    return {
      kind: "wrong",
      attemptsRemaining: Math.max(0, MAX_PIN_ATTEMPTS - ipAttempt.count),
    };
  }

  // Correct PIN: clear this IP's counter and give back the reserved portfolio
  // try. Earlier failures stay until the window ends, so a legit unlock cannot
  // reset an attack.
  await Promise.all([
    PinAttempt.deleteOne({ key: ipKey }),
    PinAttempt.release(portfolioKey),
  ]);

  if (pinHashVersionOf(stored) === PIN_HASH_V1) {
    await upgradePinHash(portfolio._id, stored.pinHash, pin);
  }

  return { kind: "unlocked", token: createAccessToken(slug, now.getTime()) };
}

/* ---------- downloads ---------- */

export type FileSource =
  | { kind: "redirect"; url: string }
  | { kind: "stream"; url: string; details: DownloadDetails };

/** Where to get a published document; checks the PIN cookie when protection is on. */
export async function documentSource(
  slug: string,
  documentId: string,
  cookieHeader: string | undefined
): Promise<FileSource> {
  const portfolio = await Portfolio.findOne({ slug, status: "published" });

  if (!portfolio) throw new AppError(404, "Published portfolio not found.");

  const document = portfolio.documents.id(documentId);

  if (!document) throw new AppError(404, "Document not found.");

  if (portfolio.documentProtection?.enabled) {
    const token = readCookie(cookieHeader, accessCookieName(slug));

    if (!verifyAccessToken(slug, token)) {
      throw new AppError(403, "Document access requires the portfolio PIN.");
    }
  }

  if (!document.publicId) {
    // Old documents were uploaded as public Cloudinary files.
    if (document.fileUrl) return { kind: "redirect", url: document.fileUrl };

    throw new AppError(404, "Document file is unavailable.");
  }

  // Authenticated Cloudinary assets come through a short-lived signed URL;
  // the file is streamed with its uploaded name, not Cloudinary's public ID.
  const details = getDocumentDownloadDetails(document);
  const url = cloudinary.utils.private_download_url(document.publicId, details.format, {
    resource_type: document.resourceType || "raw",
    type: "authenticated",
    expires_at: Math.floor((Date.now() + 2 * 60 * 1000) / 1000),
    attachment: true,
  });

  return { kind: "stream", url, details };
}

const CLOUDINARY_HOSTS = [
  "res.cloudinary.com",
  "res-1.cloudinary.com",
  "res-2.cloudinary.com",
  "res-3.cloudinary.com",
  "res-4.cloudinary.com",
  "res-5.cloudinary.com",
];

/** Where to get a published portfolio's resume. Only Cloudinary HTTPS URLs. */
export async function resumeSource(slug: string): Promise<FileSource> {
  const portfolio = await Portfolio.findOne({ slug, status: "published" });
  const resume = portfolio?.resume;

  if (!resume?.fileUrl) throw new AppError(404, "Published resume not found.");

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(resume.fileUrl);
  } catch {
    throw new AppError(404, "Published resume not found.");
  }
  const urlFormat = path.extname(sourceUrl.pathname).slice(1);
  const details = getDocumentDownloadDetails({
    name: resume.name,
    mimeType: resume.mimeType,
    format: resume.format || urlFormat,
  });

  const cloudName = cloudinary.config().cloud_name;
  const hosts = new Set([
    ...CLOUDINARY_HOSTS,
    ...(cloudName ? [`${cloudName}-res.cloudinary.com`] : []),
  ]);

  if (sourceUrl.protocol !== "https:" || !hosts.has(sourceUrl.hostname)) {
    logger.error(
      { slug, hostname: sourceUrl.hostname },
      "Resume download URL is not hosted by Cloudinary"
    );
    throw new AppError(502, "Resume storage URL is invalid.");
  }

  return { kind: "stream", url: sourceUrl.toString(), details };
}
