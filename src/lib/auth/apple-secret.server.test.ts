import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { APPLE_SECRET_TTL_SECONDS, appleClientSecret } from "./apple-secret.server";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const key = {
  clientId: "cloud.quesar.signin",
  teamId: "TEAM123456",
  keyId: "KEY1234567",
  privateKey: pem,
};

function decode(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

describe("appleClientSecret", () => {
  it("mints an ES256 JWT with Apple's required claims", () => {
    const jwt = appleClientSecret(key, 1_800_000_000);
    const [header, payload] = jwt.split(".");
    expect(decode(header)).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(decode(payload)).toEqual({
      iss: "TEAM123456",
      iat: 1_800_000_000,
      exp: 1_800_000_000 + APPLE_SECRET_TTL_SECONDS,
      aud: "https://appleid.apple.com",
      sub: "cloud.quesar.signin",
    });
  });

  it("stays inside Apple's six-month ceiling", () => {
    expect(APPLE_SECRET_TTL_SECONDS).toBeLessThan(15_777_000);
  });

  it("signs with the key, verifiable by its public half (raw r||s)", () => {
    const [header, payload, signature] = appleClientSecret(key).split(".");
    const ok = verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      {
        key: createPublicKey(publicKey.export({ type: "spki", format: "pem" })),
        dsaEncoding: "ieee-p1363",
      },
      Buffer.from(signature, "base64url"),
    );
    expect(ok).toBe(true);
  });

  it("accepts a PEM whose newlines were escaped for an env var", () => {
    const escaped = { ...key, privateKey: pem.replace(/\n/g, "\\n") };
    expect(appleClientSecret(escaped).split(".")).toHaveLength(3);
  });
});
