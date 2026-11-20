import { AppError } from "../../lib/errors";
import User, { type UserDocument } from "../users/model";
import {
  NEW_PIN_PATTERN,
  disabledProtection,
  newPinProtection,
  visiblePinLength,
} from "../documents/pin";
import Portfolio, { type PortfolioDocument } from "./model";
import { EDITABLE_FIELDS, type PortfolioBody, type ProtectionInput } from "./schema";
import { toText } from "../../lib/text";

export const NEW_PIN_MESSAGE = "Document PIN must contain exactly 6 digits.";

type Plain = Record<string, unknown>;

export function normalizeSlug(value: unknown): string {
  return toText(value || "").trim().toLowerCase();
}

/** The Mongo user for a Firebase uid, or 404. */
export async function findOwner(firebaseUid: string): Promise<UserDocument> {
  const user = await User.findOne({ firebaseUid });

  if (!user) throw new AppError(404, "User not found.");

  return user;
}

/** The signed-in user's portfolio (with its PIN hash loaded), or 404. */
export async function findOwnPortfolio(firebaseUid: string): Promise<PortfolioDocument> {
  const user = await findOwner(firebaseUid);
  const portfolio = await Portfolio.findOne({ userId: user._id }).select(
    "+documentProtection.pinHash"
  );

  if (!portfolio) throw new AppError(404, "Portfolio not found.");

  return portfolio;
}

/**
 * What the owner sees: everything except the PIN hash. pinLength lets the
 * dashboard nudge owners of legacy 4-digit PINs to switch to 6 digits.
 */
export function ownerView(portfolio: PortfolioDocument): Plain {
  const result = portfolio.toObject() as Plain;
  const protection = portfolio.documentProtection;

  result.documentProtection = {
    enabled: Boolean(protection?.enabled),
    pinLength: visiblePinLength(protection),
  };

  return result;
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 11000;
}

/** Run a write; a duplicate key (slug or user) becomes the old 409. */
async function withSlugConflict<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AppError(409, "That portfolio URL is already in use.", { cause: error });
    }
    throw error;
  }
}

/**
 * documentProtection fields for a requested change, or null to keep the
 * current PIN (protection on, no new PIN sent). New PINs must be 6 digits.
 */
export async function protectionFor(
  input: ProtectionInput,
  { keepExisting, message = NEW_PIN_MESSAGE }: { keepExisting: boolean; message?: string }
) {
  if (!input.enabled) return disabledProtection();

  const pin = toText(input.pin || "");

  if (!pin && keepExisting) return null;

  if (!NEW_PIN_PATTERN.test(pin)) throw new AppError(400, message);

  return newPinProtection(pin);
}

function pickEditable(body: PortfolioBody): Plain {
  const picked: Plain = {};

  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      picked[field] = body[field];
    }
  }

  return picked;
}

function isPlainObject(value: unknown): value is Plain {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Set only the profile fields that were sent, so a partial update (for
 * example the dashboard Profile page) keeps imageUrl, availableForWork and
 * the rest. Sending "" still clears a field. Unknown keys are ignored.
 */
function mergeProfile(portfolio: PortfolioDocument, profile: Plain, prefix = "profile"): void {
  for (const [key, value] of Object.entries(profile)) {
    const path = `${prefix}.${key}`;
    const pathType = Portfolio.schema.pathType(path);

    if (pathType === "real") {
      portfolio.set(path, value);
    } else if (pathType === "nested" && isPlainObject(value)) {
      // availability and travel merge one level down too
      mergeProfile(portfolio, value, path);
    }
  }
}

export async function createPortfolio(
  firebaseUid: string,
  body: PortfolioBody
): Promise<PortfolioDocument> {
  const user = await findOwner(firebaseUid);

  if (await Portfolio.exists({ userId: user._id })) {
    throw new AppError(409, "You already have a portfolio.");
  }

  const status = body.status === "published" ? "published" : "draft";
  const documentProtection = body.documentProtection?.enabled
    ? await protectionFor(body.documentProtection, { keepExisting: false })
    : disabledProtection();

  return withSlugConflict(() =>
    Portfolio.create({
      ...pickEditable(body),
      userId: user._id,
      slug: normalizeSlug(body.slug),
      status,
      documentProtection,
      publishedAt: status === "published" ? new Date() : null,
    })
  );
}

export async function updatePortfolio(
  firebaseUid: string,
  body: PortfolioBody
): Promise<PortfolioDocument> {
  const portfolio = await findOwnPortfolio(firebaseUid);

  for (const [field, value] of Object.entries(pickEditable(body))) {
    if (field === "profile" && isPlainObject(value)) {
      mergeProfile(portfolio, value);
    } else {
      portfolio.set(field, value);
    }
  }

  if (body.documentProtection) {
    const protection = await protectionFor(body.documentProtection, { keepExisting: true });

    if (protection) {
      portfolio.set("documentProtection", protection);
    } else {
      portfolio.set("documentProtection.enabled", true);
    }
  }

  portfolio.publishedAt =
    portfolio.status === "published" ? portfolio.publishedAt || new Date() : null;

  await withSlugConflict(() => portfolio.save());

  return portfolio;
}

export async function deletePortfolio(firebaseUid: string): Promise<void> {
  const user = await findOwner(firebaseUid);
  const deleted = await Portfolio.findOneAndDelete({ userId: user._id });

  if (!deleted) throw new AppError(404, "Portfolio not found.");
}

/** A published portfolio by slug (PIN hash not loaded), or null. */
export function findPublished(slug: string) {
  return Portfolio.findOne({ slug, status: "published" });
}

type StoredDocument = {
  _id?: unknown;
  name?: string | null;
  type?: string | null;
  format?: string | null;
  size?: number | null;
  protected?: boolean | null;
};

/** Public document info only. NEVER fileUrl or publicId. */
function publicDocument(document: StoredDocument): Plain {
  return {
    _id: document._id,
    name: document.name || "",
    type: document.type || document.format || "Document",
    size: document.size || 0,
    protected: document.protected !== false,
  };
}

/** Only the listed keys that are set, from a stored object. */
function pick(source: unknown, keys: readonly string[]): Plain {
  const picked: Plain = {};

  if (!isPlainObject(source)) return picked;

  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key];
  }

  return picked;
}

// What the public page reads. Anything else (userId, video and file ids,
// timestamps, social links, skill levels) stays on the server.
const PUBLIC_PROFILE = [
  "name",
  "title",
  "location",
  "email",
  "phone",
  "imageUrl",
  "availableForWork",
  "availability",
  "workArea",
  "travel",
  "languages",
  "driversLicence",
] as const;
const PUBLIC_HERO = ["greeting", "headline", "description"] as const;
const PUBLIC_ABOUT = ["title", "description", "videoUrl"] as const;
const PUBLIC_EXPERIENCE = [
  "company",
  "position",
  "title",
  "duration",
  "year",
  "startDate",
  "endDate",
  "isCurrent",
  "location",
  "description",
] as const;
const PUBLIC_EDUCATION = ["institution", "degree", "fieldOfStudy", "year", "description"] as const;

function publicSkill(skill: unknown): unknown {
  return typeof skill === "string" ? skill : pick(skill, ["name"]);
}

const listOf = (value: unknown) => (Array.isArray(value) ? (value as unknown[]) : []);

/** The public page for a slug, or 404. Only whitelisted fields are returned. */
export async function publicPortfolio(slug: string): Promise<Plain> {
  const portfolio = await findPublished(slug);

  if (!portfolio) throw new AppError(404, "Published portfolio not found.");

  const stored = portfolio.toObject() as Plain;

  return {
    slug: portfolio.slug,
    status: portfolio.status,
    profile: pick(stored.profile, PUBLIC_PROFILE),
    hero: pick(stored.hero, PUBLIC_HERO),
    about: pick(stored.about, PUBLIC_ABOUT),
    experience: listOf(stored.experience).map((item) => pick(item, PUBLIC_EXPERIENCE)),
    education: listOf(stored.education).map((item) => pick(item, PUBLIC_EDUCATION)),
    skills: listOf(stored.skills).map(publicSkill),
    documents: (listOf(stored.documents) as StoredDocument[]).map(publicDocument),
    // The file itself is served by GET /:slug/resume, never its storage URL.
    resume: portfolio.resume?.fileUrl
      ? {
          name: portfolio.resume.name,
          fileUrl: `/api/portfolios/${encodeURIComponent(slug)}/resume`,
        }
      : null,
    // Viewers need the PIN length to show 4 or 6 boxes.
    documentProtection: {
      enabled: Boolean(portfolio.documentProtection?.enabled),
      pinLength: visiblePinLength(portfolio.documentProtection),
    },
  };
}
