/**
 * Cross-language contract for `apple-secret.server.ts` and the Rust client
 * secret in `server/crates/quesar-auth/src/providers/apple.rs`.
 *
 * Always verifies `server/contract/apple-secret-vectors.json` against the real
 * `appleClientSecret`: the recorded output has the header and payload the
 * function produces today for the recorded input, and its signature verifies
 * with the recorded public key. ES256 signatures are randomised, so the Rust
 * test compares the header and payload segments byte for byte and verifies
 * both signatures instead of comparing them.
 *
 * Writes nothing unless `GEN_CONTRACT_VECTORS=1`:
 *
 *   GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/auth/apple-secret-contract.test.ts
 */
import { createPublicKey, createPrivateKey, verify } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appleClientSecret } from "./apple-secret.server";

// A FAKE test key, generated once for this file with
// `openssl ecparam -genkey -name prime256v1 | openssl pkcs8 -topk8 -nocrypt`.
// It belongs to no Apple account and signs nothing real. Never use it anywhere else.
const FAKE_TEST_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgTpwS9WTEChGiHmsn
8rlez6pqDJIYlwHLz5gXrAF6/OChRANCAASwk2CghNfhgL7dEHqIHWygHm5rKec1
nVoWiqrcBVzS72SDp9ns77haaDPxz+3DbNHHBY+JZcXkp9abOmtyU7Ec
-----END PRIVATE KEY-----
`;

const KEY = {
  clientId: "cloud.quesar.test",
  teamId: "FAKETEAM01",
  keyId: "FAKEKEY001",
  privateKey: FAKE_TEST_KEY_PEM,
};
const NOW_SECONDS = 1_800_000_000;

const FILE = new URL("../../../server/contract/apple-secret-vectors.json", import.meta.url);

type VectorFile = {
  description: string;
  key: {
    client_id: string;
    team_id: string;
    key_id: string;
    private_key_pem: string;
    public_key_pem: string;
    note: string;
  };
  now: number;
  secret: string;
};

function publicKeyPem(): string {
  return createPublicKey(createPrivateKey(FAKE_TEST_KEY_PEM))
    .export({ type: "spki", format: "pem" })
    .toString();
}

function generate(): VectorFile {
  return {
    description:
      "Minted by src/lib/auth/apple-secret.server.ts. Regenerate: GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/auth/apple-secret-contract.test.ts",
    key: {
      client_id: KEY.clientId,
      team_id: KEY.teamId,
      key_id: KEY.keyId,
      private_key_pem: FAKE_TEST_KEY_PEM,
      public_key_pem: publicKeyPem(),
      note: "FAKE TEST KEY ONLY: generated for this contract, belongs to no Apple account.",
    },
    now: NOW_SECONDS,
    secret: appleClientSecret(KEY, NOW_SECONDS),
  };
}

if (process.env.GEN_CONTRACT_VECTORS === "1") {
  writeFileSync(FILE, `${JSON.stringify(generate(), null, 2)}\n`);
}

const file = JSON.parse(readFileSync(FILE, "utf8")) as VectorFile;

describe("apple client secret contract vectors", () => {
  it("records the documented fake key and input", () => {
    expect(file.key.private_key_pem).toBe(FAKE_TEST_KEY_PEM);
    expect(file.key.public_key_pem).toBe(publicKeyPem());
    expect(file.key.client_id).toBe(KEY.clientId);
    expect(file.key.team_id).toBe(KEY.teamId);
    expect(file.key.key_id).toBe(KEY.keyId);
    expect(file.now).toBe(NOW_SECONDS);
  });

  it("the recorded header and payload are what the function mints today", () => {
    const [header, payload] = file.secret.split(".");
    const [freshHeader, freshPayload] = appleClientSecret(KEY, NOW_SECONDS).split(".");
    expect(header).toBe(freshHeader);
    expect(payload).toBe(freshPayload);
  });

  it("the recorded signature is a raw 64-byte r||s that verifies with the public key", () => {
    const [header, payload, signature] = file.secret.split(".");
    const raw = Buffer.from(signature, "base64url");
    expect(raw).toHaveLength(64);
    expect(
      verify(
        "sha256",
        Buffer.from(`${header}.${payload}`),
        { key: createPublicKey(file.key.public_key_pem), dsaEncoding: "ieee-p1363" },
        raw,
      ),
    ).toBe(true);
  });
});
