/**
 * Application-level sealing for data at rest (conversation audits, workspace
 * refresh tokens). Replaces mlai's GCP KMS envelope: AES-256-GCM under
 * `APP_ENCRYPTION_KEY`, with additional authenticated data binding each blob
 * to its owner and purpose so a sealed value cannot be moved between rows.
 *
 * Envelope: `v1.<iv>.<ciphertext>.<tag>`, each part base64url.
 * Key: 32 bytes, given as base64/base64url (44/43 chars) or hex (64 chars).
 * Generate one with `openssl rand -base64 32`.
 *
 * Rotation: set the new key as `APP_ENCRYPTION_KEY` and the old one as
 * `APP_ENCRYPTION_KEY_PREVIOUS`. `open` tries the active key, then the previous
 * one, and reports `rotated: true` via `openWithRotation` so callers can re-seal.
 *
 * Fail closed: without a valid key, `seal` and `open` throw
 * `EncryptionUnavailableError`. Callers must refuse the feature, never fall
 * back to plaintext.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { env } from "@/lib/env.server";

export class EncryptionUnavailableError extends Error {
  constructor(message = "APP_ENCRYPTION_KEY is not configured") {
    super(message);
    this.name = "EncryptionUnavailableError";
  }
}

export class SealedDataError extends Error {
  constructor(message = "sealed value failed authentication") {
    super(message);
    this.name = "SealedDataError";
  }
}

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function parseKey(raw: string | undefined): Buffer {
  if (!raw) throw new EncryptionUnavailableError();
  const value = raw.trim();
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(value)) key = Buffer.from(value, "hex");
  else key = Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (key.length !== 32) {
    throw new EncryptionUnavailableError("APP_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

function activeKey(): Buffer {
  return parseKey(env("APP_ENCRYPTION_KEY"));
}

/** Derive a purpose-specific subkey so sealing and hashing never share key material. */
function subkey(key: Buffer, purpose: string): Buffer {
  return createHmac("sha256", key).update(`quesar:${purpose}`).digest();
}

export function sealWithKey(key: Buffer, plaintext: string, aad: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", subkey(key, "seal"), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function openWithKey(key: Buffer, envelope: string, aad: string): string {
  const parts = envelope.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION)
    throw new SealedDataError("unknown envelope format");
  const [, ivPart, ctPart, tagPart] = parts;
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES)
    throw new SealedDataError("malformed envelope");
  try {
    const decipher = createDecipheriv("aes-256-gcm", subkey(key, "seal"), iv);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(ctPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new SealedDataError();
  }
}

/** Seal `plaintext` bound to `aad` (e.g. `audit:<id>:<userId>`). */
export function seal(plaintext: string, aad: string): string {
  return sealWithKey(activeKey(), plaintext, aad);
}

function previousKey(): Buffer | null {
  const raw = env("APP_ENCRYPTION_KEY_PREVIOUS");
  if (!raw) return null;
  try {
    return parseKey(raw);
  } catch {
    return null;
  }
}

/**
 * Open with the active key, falling back to `APP_ENCRYPTION_KEY_PREVIOUS`.
 * `rotated` is true when only the previous key worked: re-seal and store.
 */
export function openWithRotation(
  envelope: string,
  aad: string,
): { plaintext: string; rotated: boolean } {
  const active = activeKey();
  try {
    return { plaintext: openWithKey(active, envelope, aad), rotated: false };
  } catch (error) {
    const previous = previousKey();
    if (!previous || !(error instanceof SealedDataError)) throw error;
    return { plaintext: openWithKey(previous, envelope, aad), rotated: true };
  }
}

/** Open a sealed value; throws `SealedDataError` on tamper or AAD mismatch. */
export function open(envelope: string, aad: string): string {
  return openWithRotation(envelope, aad).plaintext;
}

/** Keyed, non-reversible identifier (replaces mlai's AUDIT_SUBJECT_PEPPER hash). */
export function keyedHash(value: string, purpose = "subject"): string {
  return createHmac("sha256", subkey(activeKey(), `hash:${purpose}`))
    .update(value)
    .digest("base64url");
}

/** Unkeyed SHA-256 digest (integrity fingerprint of plaintext content). */
export function digest(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function encryptionConfigured(): boolean {
  try {
    activeKey();
    return true;
  } catch {
    return false;
  }
}
