import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  EncryptionUnavailableError,
  SealedDataError,
  encryptionConfigured,
  open,
  openWithKey,
  openWithRotation,
  parseKey,
  seal,
  sealWithKey,
} from "./crypto.server";

const keyA = randomBytes(32);
const keyB = randomBytes(32);

afterEach(() => {
  delete process.env.APP_ENCRYPTION_KEY;
  delete process.env.APP_ENCRYPTION_KEY_PREVIOUS;
});

describe("crypto.server", () => {
  it("round-trips plaintext bound to its AAD", () => {
    const sealed = sealWithKey(keyA, "hello audit", "audit:1:user-a");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("hello");
    expect(openWithKey(keyA, sealed, "audit:1:user-a")).toBe("hello audit");
  });

  it("uses a fresh IV per seal", () => {
    expect(sealWithKey(keyA, "same", "aad")).not.toBe(sealWithKey(keyA, "same", "aad"));
  });

  it("rejects a tampered ciphertext", () => {
    const sealed = sealWithKey(keyA, "secret", "aad");
    const parts = sealed.split(".");
    const ct = Buffer.from(parts[2], "base64url");
    ct[0] ^= 0xff;
    parts[2] = ct.toString("base64url");
    expect(() => openWithKey(keyA, parts.join("."), "aad")).toThrow(SealedDataError);
  });

  it("rejects the wrong AAD (a blob moved to another row)", () => {
    const sealed = sealWithKey(keyA, "secret", "audit:1:user-a");
    expect(() => openWithKey(keyA, sealed, "audit:1:user-b")).toThrow(SealedDataError);
  });

  it("rejects the wrong key", () => {
    const sealed = sealWithKey(keyA, "secret", "aad");
    expect(() => openWithKey(keyB, sealed, "aad")).toThrow(SealedDataError);
  });

  it("fails closed without a key", () => {
    expect(encryptionConfigured()).toBe(false);
    expect(() => seal("x", "aad")).toThrow(EncryptionUnavailableError);
  });

  it("accepts base64 and hex keys and rejects wrong lengths", () => {
    expect(parseKey(keyA.toString("base64")).equals(keyA)).toBe(true);
    expect(parseKey(keyA.toString("base64url")).equals(keyA)).toBe(true);
    expect(parseKey(keyA.toString("hex")).equals(keyA)).toBe(true);
    expect(() => parseKey(randomBytes(16).toString("base64"))).toThrow(EncryptionUnavailableError);
  });

  it("seals through the environment key", () => {
    process.env.APP_ENCRYPTION_KEY = keyA.toString("base64");
    expect(encryptionConfigured()).toBe(true);
    expect(open(seal("via env", "aad"), "aad")).toBe("via env");
  });

  it("opens values sealed under the previous key after rotation, and flags them", () => {
    const old = sealWithKey(keyA, "legacy", "aad");
    process.env.APP_ENCRYPTION_KEY = keyB.toString("base64");
    expect(() => open(old, "aad")).toThrow(SealedDataError);
    process.env.APP_ENCRYPTION_KEY_PREVIOUS = keyA.toString("base64");
    expect(openWithRotation(old, "aad")).toEqual({ plaintext: "legacy", rotated: true });
    const fresh = seal("new", "aad");
    expect(openWithRotation(fresh, "aad")).toEqual({ plaintext: "new", rotated: false });
  });
});
