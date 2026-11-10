/**
 * Cross-language contract for `clientSubject` in `rate-limit.server.ts` and the
 * Rust subject derivation in `server/crates/quesar-services`.
 *
 * Always verifies that every vector in `server/contract/rate-limit-subjects.json`
 * is what the real TypeScript function returns. Writes nothing unless
 * `GEN_CONTRACT_VECTORS=1`, which first regenerates the file from the cases below:
 *
 *   GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/server/rate-limit-contract.test.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientSubject } from "./rate-limit.server";

// Obviously fake; the real secret is APP_ENCRYPTION_KEY or BETTER_AUTH_SECRET.
const TEST_SECRET = "contract-test-secret-not-real";

const FILE = new URL("../../../server/contract/rate-limit-subjects.json", import.meta.url);

type Headers = {
  "cf-connecting-ip"?: string;
  "x-real-ip"?: string;
  "x-forwarded-for"?: string;
};
type Case = { name: string; trusted_proxy: string; headers: Headers };
type Vector = Case & { subject: string };
type VectorFile = { description: string; secret: string; vectors: Vector[] };

const CASES: Case[] = [
  { name: "ipv4 via x-real-ip", trusted_proxy: "", headers: { "x-real-ip": "203.0.113.9" } },
  {
    name: "ipv6 via x-real-ip",
    trusted_proxy: "",
    headers: { "x-real-ip": "2001:db8:85a3::8a2e:370:7334" },
  },
  {
    name: "rightmost x-forwarded-for hop",
    trusted_proxy: "",
    headers: { "x-forwarded-for": "1.1.1.1, 198.51.100.7 , 203.0.113.9" },
  },
  {
    name: "x-real-ip wins over x-forwarded-for",
    trusted_proxy: "",
    headers: { "x-real-ip": "198.51.100.4", "x-forwarded-for": "203.0.113.9" },
  },
  {
    name: "cf-connecting-ip ignored without a trusted cloudflare",
    trusted_proxy: "",
    headers: { "x-real-ip": "198.51.100.4", "cf-connecting-ip": "192.0.2.1" },
  },
  {
    name: "cf-connecting-ip trusted behind cloudflare",
    trusted_proxy: "cloudflare",
    headers: { "x-real-ip": "198.51.100.4", "cf-connecting-ip": "192.0.2.1" },
  },
  {
    name: "empty x-real-ip is used as given",
    trusted_proxy: "",
    headers: { "x-real-ip": "", "x-forwarded-for": "203.0.113.9" },
  },
  { name: "no headers", trusted_proxy: "", headers: {} },
];

function subjectFor(c: Case): string {
  const previous = process.env.TRUSTED_PROXY;
  process.env.TRUSTED_PROXY = c.trusted_proxy;
  try {
    return clientSubject(new Request("https://quesar.cloud/", { headers: c.headers }));
  } finally {
    if (previous === undefined) delete process.env.TRUSTED_PROXY;
    else process.env.TRUSTED_PROXY = previous;
  }
}

beforeEach(() => {
  process.env.APP_ENCRYPTION_KEY = TEST_SECRET;
});

afterEach(() => {
  delete process.env.APP_ENCRYPTION_KEY;
});

if (process.env.GEN_CONTRACT_VECTORS === "1") {
  process.env.APP_ENCRYPTION_KEY = TEST_SECRET;
  const file: VectorFile = {
    description:
      "Produced by clientSubject() in src/lib/server/rate-limit.server.ts. Regenerate: GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/server/rate-limit-contract.test.ts",
    secret: TEST_SECRET,
    vectors: CASES.map((c) => ({ ...c, subject: subjectFor(c) })),
  };
  writeFileSync(FILE, `${JSON.stringify(file, null, 2)}\n`);
  delete process.env.APP_ENCRYPTION_KEY;
}

describe("rate-limit contract: client subjects", () => {
  const file = JSON.parse(readFileSync(FILE, "utf8")) as VectorFile;

  it("uses the documented test secret and covers every case", () => {
    expect(file.secret).toBe(TEST_SECRET);
    expect(file.vectors.map((v) => v.name)).toEqual(CASES.map((c) => c.name));
  });

  for (const vector of file.vectors) {
    it(`derives: ${vector.name}`, () => {
      const { subject, ...c } = vector;
      expect(subject).toHaveLength(32);
      expect(subjectFor(c)).toBe(subject);
    });
  }
});
