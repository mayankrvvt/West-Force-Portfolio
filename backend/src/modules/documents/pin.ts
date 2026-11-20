import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions
) => Promise<Buffer>;

/** New PINs must be 6 digits. */
export const NEW_PIN_PATTERN = /^\d{6}$/;
/** Unlock still accepts legacy 4-digit PINs. */
export const UNLOCK_PIN_PATTERN = /^(?:\d{4}|\d{6})$/;

export const LEGACY_PIN_LENGTH = 4;
export const PIN_HASH_V1 = 1;
export const PIN_HASH_V2 = 2;

const V2_PREFIX = "scrypt";
const SALT_BYTES = 16;
const KEY_BYTES = 32;
// Node's defaults (N=2^14), written out so changing them needs a new version.
const SCRYPT_OPTIONS: crypto.ScryptOptions = { N: 16384, r: 8, p: 1 };

export type StoredPin = {
  pinHash?: string | null;
  pinHashVersion?: number | null;
};

export type PinProtection = {
  enabled: true;
  pinHash: string;
  pinLength: number;
  pinHashVersion: number;
};

export function documentAccessSecret(): string {
  const secret = process.env.DOCUMENT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("DOCUMENT_ACCESS_SECRET is not configured.");
  }

  return secret;
}

/** v1 (legacy): sha256("<secret>:<pin>") as hex. Only used to check old hashes. */
export function hashPinV1(pin: string): string {
  return crypto
    .createHash("sha256")
    .update(`${documentAccessSecret()}:${pin}`)
    .digest("hex");
}

/** v2: scrypt("<secret>:<pin>") with a random per-PIN salt, stored as "scrypt$<salt>$<key>". */
export async function hashPinV2(pin: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await scrypt(`${documentAccessSecret()}:${pin}`, salt, KEY_BYTES, SCRYPT_OPTIONS);
  return [V2_PREFIX, salt.toString("hex"), key.toString("hex")].join("$");
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Which scheme a stored hash uses. Records without a version are legacy v1. */
export function pinHashVersionOf(stored: StoredPin): number {
  return stored.pinHashVersion === PIN_HASH_V2 ? PIN_HASH_V2 : PIN_HASH_V1;
}

/** Check a PIN against a stored v1 or v2 hash in constant time. */
export async function verifyPin(pin: string, stored: StoredPin): Promise<boolean> {
  const pinHash = stored.pinHash || "";

  if (!pinHash) return false;

  if (pinHashVersionOf(stored) === PIN_HASH_V1) {
    return safeEqual(Buffer.from(hashPinV1(pin)), Buffer.from(pinHash));
  }

  const [prefix, saltHex, keyHex] = pinHash.split("$");

  if (prefix !== V2_PREFIX || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");

  if (expected.length !== KEY_BYTES) return false;

  const actual = await scrypt(
    `${documentAccessSecret()}:${pin}`,
    Buffer.from(saltHex, "hex"),
    KEY_BYTES,
    SCRYPT_OPTIONS
  );

  return safeEqual(actual, expected);
}

/** documentProtection fields for a newly set PIN (always v2). */
export async function newPinProtection(pin: string): Promise<PinProtection> {
  return {
    enabled: true,
    pinHash: await hashPinV2(pin),
    pinLength: pin.length,
    pinHashVersion: PIN_HASH_V2,
  };
}

/** documentProtection fields when protection is off. */
export function disabledProtection() {
  return { enabled: false, pinHash: "", pinLength: null, pinHashVersion: null };
}

/** The PIN length to show: null when off, 4 for legacy records without a length. */
export function visiblePinLength(
  protection: { enabled?: boolean | null; pinLength?: number | null } | null | undefined
): number | null {
  if (!protection?.enabled) return null;
  return protection.pinLength || LEGACY_PIN_LENGTH;
}
