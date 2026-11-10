/**
 * Cross-language contract for `crypto.server.ts` and the Rust sealing in
 * `server/crates/quesar-services`.
 *
 * Always verifies that every vector in both JSON files opens with the real
 * TypeScript functions to the recorded plaintext:
 * - `server/contract/crypto-vectors.json`: sealed here by TypeScript;
 * - `server/contract/crypto-vectors-rust.json`: sealed by Rust.
 *
 * Writes nothing unless `GEN_CONTRACT_VECTORS=1`, which first regenerates the
 * TypeScript-sealed file from the fixed cases and the fixed TEST keys below:
 *
 *   GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/server/crypto-contract.test.ts
 *
 * Then regenerate the Rust-sealed file from it (it reuses these cases):
 *
 *   cargo run --manifest-path server/Cargo.toml -p quesar-services --example gen_vectors
 */
import { readFileSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { open, openWithRotation, sealWithKey } from "./crypto.server";

// Obviously fake keys: 32 bytes of 0x01 and 0x02. Never use them anywhere real.
const TEST_KEY_CURRENT = Buffer.alloc(32, 0x01);
const TEST_KEY_PREVIOUS = Buffer.alloc(32, 0x02);

const TS_FILE = new URL("../../../server/contract/crypto-vectors.json", import.meta.url);
const RUST_FILE = new URL("../../../server/contract/crypto-vectors-rust.json", import.meta.url);

type Vector = {
  name: string;
  /** Which test key sealed it: the current key or the previous one. */
  sealed_with: "current" | "previous";
  associated_data: string;
  /** UTF-8 plaintext, base64 encoded. */
  plaintext_base64: string;
  envelope: string;
};
type VectorFile = {
  description: string;
  keys: { current_base64: string; previous_base64: string; note: string };
  vectors: Vector[];
};

const pattern = Array.from({ length: 64 * 1024 }, (_, i) => String.fromCharCode(33 + (i % 90)));

const CASES: {
  name: string;
  sealed_with: "current" | "previous";
  aad: string;
  plaintext: string;
}[] = [
  { name: "empty plaintext, empty aad", sealed_with: "current", aad: "", plaintext: "" },
  { name: "empty plaintext, aad", sealed_with: "current", aad: "audit:1:user-a", plaintext: "" },
  { name: "ascii, aad", sealed_with: "current", aad: "audit:42:user-a", plaintext: "hello audit" },
  { name: "ascii, empty aad", sealed_with: "current", aad: "", plaintext: "no aad here" },
  {
    name: "multi-byte utf-8, multi-byte aad",
    sealed_with: "current",
    aad: "workspace:ünï:用户",
    plaintext: "héllo wörld — 日本語 \u{1F680} naïve",
  },
  { name: "64 KiB payload", sealed_with: "current", aad: "big:1", plaintext: pattern.join("") },
  {
    name: "sealed under the previous key",
    sealed_with: "previous",
    aad: "audit:7:user-b",
    plaintext: "legacy value",
  },
];

function generate(): VectorFile {
  return {
    description:
      "Sealed by src/lib/server/crypto.server.ts. Regenerate: GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/server/crypto-contract.test.ts",
    keys: {
      current_base64: TEST_KEY_CURRENT.toString("base64"),
      previous_base64: TEST_KEY_PREVIOUS.toString("base64"),
      note: "TEST KEYS ONLY: 32 bytes of 0x01 and of 0x02. Not secrets.",
    },
    vectors: CASES.map((c) => ({
      name: c.name,
      sealed_with: c.sealed_with,
      associated_data: c.aad,
      plaintext_base64: Buffer.from(c.plaintext, "utf8").toString("base64"),
      envelope: sealWithKey(
        c.sealed_with === "current" ? TEST_KEY_CURRENT : TEST_KEY_PREVIOUS,
        c.plaintext,
        c.aad,
      ),
    })),
  };
}

if (process.env.GEN_CONTRACT_VECTORS === "1") {
  writeFileSync(TS_FILE, `${JSON.stringify(generate(), null, 2)}\n`);
}

function load(url: URL): VectorFile {
  return JSON.parse(readFileSync(url, "utf8")) as VectorFile;
}

beforeEach(() => {
  process.env.APP_ENCRYPTION_KEY = TEST_KEY_CURRENT.toString("base64");
  process.env.APP_ENCRYPTION_KEY_PREVIOUS = TEST_KEY_PREVIOUS.toString("base64");
});

afterEach(() => {
  delete process.env.APP_ENCRYPTION_KEY;
  delete process.env.APP_ENCRYPTION_KEY_PREVIOUS;
});

describe.each([
  ["TypeScript-sealed", TS_FILE],
  ["Rust-sealed", RUST_FILE],
] as const)("crypto contract: %s vectors", (_label, url) => {
  const file = load(url);

  it("uses the documented test keys and covers every case", () => {
    expect(file.keys.current_base64).toBe(TEST_KEY_CURRENT.toString("base64"));
    expect(file.keys.previous_base64).toBe(TEST_KEY_PREVIOUS.toString("base64"));
    expect(file.vectors.map((v) => v.name)).toEqual(CASES.map((c) => c.name));
  });

  for (const vector of file.vectors) {
    it(`opens: ${vector.name}`, () => {
      const expected = Buffer.from(vector.plaintext_base64, "base64").toString("utf8");
      expect(vector.envelope.startsWith("v1.")).toBe(true);
      expect(open(vector.envelope, vector.associated_data)).toBe(expected);
      expect(openWithRotation(vector.envelope, vector.associated_data)).toEqual({
        plaintext: expected,
        rotated: vector.sealed_with === "previous",
      });
    });
  }
});
