/**
 * Cross-language contract for the public functions of the Rust server
 * (`server/crates/quesar-services`). Always verifies that every vector in the
 * committed files is what the real TypeScript function returns. Writes nothing
 * unless `GEN_CONTRACT_VECTORS=1`, which first regenerates the files from the
 * cases below:
 *
 *   GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/server/public-contract.test.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeOrigin } from "@/lib/quasar/connection";

const ORIGIN_FILE = new URL("../../../server/contract/quasar-origin-vectors.json", import.meta.url);

type OriginVector = { name: string; input: string; origin: string | null };
type OriginFile = { description: string; vectors: OriginVector[] };

// The result of `normalizeOrigin`, or null where it throws.
function originFor(input: string): string | null {
  try {
    return normalizeOrigin(input);
  } catch {
    return null;
  }
}

const ORIGIN_CASES: { name: string; input: string }[] = [
  { name: "plain https", input: "https://example.com" },
  { name: "default https port is dropped", input: "https://example.com:443" },
  { name: "default http port is dropped", input: "http://example.com:80" },
  { name: "other port is kept", input: "http://localhost:4700" },
  { name: "host is lowercased", input: "https://Example.COM" },
  { name: "scheme is case-insensitive", input: "HTTPS://example.com" },
  { name: "one trailing slash", input: "https://example.com/" },
  { name: "ipv4 literal", input: "http://127.0.0.1:4700" },
  { name: "ipv6 literal", input: "http://[::1]:4700" },
  { name: "ipv6 literal, default port", input: "https://[2001:db8::1]:443/" },
  { name: "surrounding whitespace", input: "  https://example.com  " },
  { name: "ecmascript whitespace (bom, nbsp)", input: "﻿https://example.com " },
  { name: "internationalized host", input: "https://bücher.example" },
  { name: "tab inside the host is stripped", input: "https://exa\tmple.com" },
  { name: "path", input: "https://example.com/api" },
  { name: "two trailing slashes", input: "https://example.com//" },
  { name: "query", input: "https://example.com?x=1" },
  { name: "empty query", input: "https://example.com?" },
  { name: "fragment", input: "https://example.com#top" },
  { name: "userinfo", input: "https://user@example.com" },
  { name: "userinfo with password", input: "https://user:pass@example.com" },
  { name: "backslash", input: "https:\\\\example.com" },
  { name: "backslash in the authority", input: "https://example.com\\evil" },
  { name: "ftp scheme", input: "ftp://example.com" },
  { name: "no scheme", input: "example.com" },
  { name: "scheme only", input: "https://" },
  { name: "scheme and slash", input: "https:///" },
  { name: "empty", input: "" },
  { name: "whitespace only", input: "   " },
  { name: "space inside the host", input: "https://exa mple.com" },
  { name: "port out of range", input: "https://example.com:99999" },
  { name: "empty port", input: "https://example.com:" },
  { name: "non-numeric port", input: "https://example.com:abc" },
  { name: "percent-encoded host", input: "https://exa%6dple.com" },
  { name: "trailing newline after trim", input: "https://example.com\n" },
];

if (process.env.GEN_CONTRACT_VECTORS === "1") {
  const file: OriginFile = {
    description:
      "Produced by normalizeOrigin() in src/lib/quasar/connection.ts; origin is null where it throws. Regenerate: GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/server/public-contract.test.ts",
    vectors: ORIGIN_CASES.map((c) => ({ ...c, origin: originFor(c.input) })),
  };
  writeFileSync(ORIGIN_FILE, `${JSON.stringify(file, null, 2)}\n`);
}

describe("public contract: quasar origin normalisation", () => {
  const file = JSON.parse(readFileSync(ORIGIN_FILE, "utf8")) as OriginFile;

  it("covers every case", () => {
    expect(file.vectors.map((v) => v.name)).toEqual(ORIGIN_CASES.map((c) => c.name));
  });

  for (const vector of file.vectors) {
    it(`normalises: ${vector.name}`, () => {
      expect(originFor(vector.input)).toBe(vector.origin);
    });
  }
});
