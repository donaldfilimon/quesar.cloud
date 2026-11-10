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
import {
  coerceInquiryInput,
  validateInquiry,
  type InquiryInput,
  type InquiryValidation,
} from "@/lib/inquiry-rules";

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

const INQUIRY_FILE = new URL("../../../server/contract/inquiry-vectors.json", import.meta.url);

type InquiryVector = {
  name: string;
  input: unknown;
  // coerceInquiryInput(input), the token without a trailing lone high
  // surrogate (JSON cannot carry one); tokenPairCut says it was removed.
  coerced: Omit<InquiryInput, "turnstileToken"> & { turnstileToken: string; tokenPairCut: boolean };
  validation: InquiryValidation;
};
type InquiryFile = { description: string; vectors: InquiryVector[] };

const GOOD = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  company: "",
  topic: "Quesar",
  message: "I would like to talk about WDBX provenance.",
  turnstileToken: "",
};
const ASTRAL = "😀"; // two UTF-16 units
const good = (over: Record<string, unknown>) => ({ ...GOOD, ...over });
const json = (text: string): unknown => JSON.parse(text);

// Inputs are JSON values (they cross the wire as JSON). Hostile objects are
// built with JSON.parse so that "__proto__" is an own property, as on the wire.
const INQUIRY_CASES: { name: string; input: unknown }[] = [
  { name: "complete", input: GOOD },
  { name: "fields are trimmed", input: good({ name: "  Ada  ", message: "  a real message here  " }) },
  { name: "every topic: ABI / WDBX", input: good({ topic: "ABI / WDBX" }) },
  { name: "every topic: Other", input: good({ topic: " Other " }) },
  { name: "topic in another case", input: good({ topic: "quesar" }) },
  { name: "topic with inner spaces changed", input: good({ topic: "ABI/WDBX" }) },
  { name: "empty topic", input: good({ topic: "" }) },
  { name: "null input", input: null },
  { name: "string input", input: "x" },
  { name: "number input", input: 5 },
  { name: "array input", input: [] },
  { name: "array of fields", input: ["Ada Lovelace", "ada@example.com"] },
  { name: "empty object", input: {} },
  {
    name: "non-string members",
    input: { name: 42, email: {}, company: null, topic: ["Quesar"], message: true, turnstileToken: 7 },
  },
  {
    name: "user id fields are ignored",
    input: good({ userId: "victim", user_id: "victim", id: 1 }),
  },
  { name: "__proto__ member", input: json('{"__proto__":{"name":"Ada Lovelace"}}') },
  { name: "constructor member", input: json('{"constructor":{"name":"Ada Lovelace"}}') },
  { name: "name 1 unit", input: good({ name: "A" }) },
  { name: "name 2 units", input: good({ name: "Al" }) },
  { name: "name 80 units", input: good({ name: "n".repeat(80) }) },
  { name: "name 81 units", input: good({ name: "n".repeat(81) }) },
  { name: "name one astral (2 units)", input: good({ name: ASTRAL }) },
  { name: "name 40 astral (80 units)", input: good({ name: ASTRAL.repeat(40) }) },
  { name: "name 41 astral (82 units)", input: good({ name: ASTRAL.repeat(41) }) },
  { name: "name 39 astral and 2 letters (80 units)", input: good({ name: `${ASTRAL.repeat(39)}ab` }) },
  { name: "name 39 astral and 3 letters (81 units)", input: good({ name: `${ASTRAL.repeat(39)}abc` }) },
  { name: "name padded with bom to 1 unit", input: good({ name: "\uFEFF\uFEFFA\uFEFF" }) },
  { name: "name padded with bom to 2 units", input: good({ name: "\uFEFFAb\uFEFF" }) },
  { name: "name with next-line padding is not trimmed", input: good({ name: "\u0085A" }) },
  { name: "name only whitespace", input: good({ name: " \t\n\u00A0\u3000" }) },
  { name: "name with nul", input: good({ name: "Ada\u0000Lovelace" }) },
  { name: "email without at", input: good({ email: "not-an-email" }) },
  { name: "email two ats", input: good({ email: "a@b@example.com" }) },
  { name: "email empty local part", input: good({ email: "@example.com" }) },
  { name: "email no dot in domain", input: good({ email: "ada@example" }) },
  { name: "email dot first in domain", input: good({ email: "ada@.example" }) },
  { name: "email dot last in domain", input: good({ email: "ada@example." }) },
  { name: "email only dots in domain", input: good({ email: "ada@.." }) },
  { name: "email double dot in domain", input: good({ email: "ada@a..b" }) },
  { name: "email dot after first character", input: good({ email: "ada@a.b" }) },
  { name: "email dot in local part only", input: good({ email: "a.da@example" }) },
  { name: "email inner space", input: good({ email: "ada lovelace@example.com" }) },
  { name: "email inner tab", input: good({ email: "ada@exam\tple.com" }) },
  { name: "email inner bom", input: good({ email: "ada@exam\uFEFFple.com" }) },
  { name: "email inner next-line is not whitespace", input: good({ email: "ad\u0085a@example.com" }) },
  { name: "email inner nbsp", input: good({ email: "ada@example\u00A0.com" }) },
  { name: "email inner line separator", input: good({ email: "ada@exam\u2028ple.com" }) },
  { name: "email inner zero-width space is not whitespace", input: good({ email: "ada@exam\u200Bple.com" }) },
  { name: "email trailing newline is trimmed", input: good({ email: "ada@example.com\n" }) },
  { name: "email padded with bom", input: good({ email: "\uFEFFada@example.com\uFEFF" }) },
  { name: "email 120 units", input: good({ email: `${"a".repeat(108)}@example.com` }) },
  { name: "email 121 units", input: good({ email: `${"a".repeat(109)}@example.com` }) },
  { name: "email astral local at 120 units", input: good({ email: `${ASTRAL.repeat(57)}a@x.co` }) },
  { name: "email astral local at 121 units", input: good({ email: `${ASTRAL.repeat(57)}ab@x.co` }) },
  { name: "email with nul", input: good({ email: "ada\u0000@example.com" }) },
  { name: "company 120 units", input: good({ company: "c".repeat(120) }) },
  { name: "company 121 units", input: good({ company: "c".repeat(121) }) },
  { name: "company 60 astral", input: good({ company: ASTRAL.repeat(60) }) },
  { name: "company 61 astral", input: good({ company: ASTRAL.repeat(61) }) },
  { name: "company padded", input: good({ company: "  Acme  " }) },
  { name: "message 9 units", input: good({ message: "123456789" }) },
  { name: "message 10 units", input: good({ message: "1234567890" }) },
  { name: "message 5 astral (10 units)", input: good({ message: ASTRAL.repeat(5) }) },
  { name: "message 4 astral and a letter (9 units)", input: good({ message: `${ASTRAL.repeat(4)}a` }) },
  { name: "message 9 units padded with bom", input: good({ message: "\uFEFF123456789\uFEFF" }) },
  { name: "message 9 units padded with next-line", input: good({ message: "\u0085123456789\u0085" }) },
  { name: "message 2000 units", input: good({ message: "m".repeat(2000) }) },
  { name: "message 2001 units", input: good({ message: "m".repeat(2001) }) },
  { name: "message 1000 astral (2000 units)", input: good({ message: ASTRAL.repeat(1000) }) },
  { name: "message 1000 astral and a letter (2001 units)", input: good({ message: `${ASTRAL.repeat(1000)}a` }) },
  { name: "message 2000 units plus padding", input: good({ message: ` \uFEFF${"m".repeat(2000)}\u3000` }) },
  { name: "check order: name before email", input: good({ name: "", email: "bad", topic: "x", message: "" }) },
  { name: "check order: email before company", input: good({ email: "bad", company: "c".repeat(121) }) },
  { name: "check order: company before topic", input: good({ company: "c".repeat(121), topic: "x" }) },
  { name: "check order: topic before message", input: good({ topic: "x", message: "" }) },
  { name: "token 4096 units", input: good({ turnstileToken: "t".repeat(4096) }) },
  { name: "token 4097 units", input: good({ turnstileToken: "t".repeat(4097) }) },
  { name: "token 4098 units is cut", input: good({ turnstileToken: "t".repeat(4098) }) },
  { name: "token cut between letters", input: good({ turnstileToken: `${"t".repeat(4090)}${"é".repeat(20)}` }) },
  { name: "token cut inside a pair", input: good({ turnstileToken: `${"t".repeat(4096)}${ASTRAL}` }) },
  { name: "token pair ends at the cut", input: good({ turnstileToken: `${"t".repeat(4095)}${ASTRAL}z` }) },
  { name: "token padded is kept untrimmed", input: good({ turnstileToken: "  token-0123456789  " }) },
  { name: "all hostile at once", input: { name: [], email: 1, company: {}, topic: null, message: false } },
];

function inquiryVector(c: { name: string; input: unknown }): InquiryVector {
  const coerced = coerceInquiryInput(c.input);
  const last = coerced.turnstileToken.charCodeAt(coerced.turnstileToken.length - 1);
  const pairCut = last >= 0xd800 && last <= 0xdbff;
  return {
    name: c.name,
    input: c.input,
    coerced: {
      ...coerced,
      turnstileToken: pairCut ? coerced.turnstileToken.slice(0, -1) : coerced.turnstileToken,
      tokenPairCut: pairCut,
    },
    validation: validateInquiry(coerced),
  };
}

if (process.env.GEN_CONTRACT_VECTORS === "1") {
  const inquiries: InquiryFile = {
    description:
      "Produced by coerceInquiryInput() and validateInquiry() in src/lib/inquiry-rules.ts. The token has any trailing lone high surrogate removed (tokenPairCut), because JSON cannot carry one and the Rust side drops the whole pair. Regenerate: GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/server/public-contract.test.ts",
    vectors: INQUIRY_CASES.map(inquiryVector),
  };
  writeFileSync(INQUIRY_FILE, `${JSON.stringify(inquiries, null, 2)}\n`);
}

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

describe("public contract: contact inquiry rules", () => {
  const file = JSON.parse(readFileSync(INQUIRY_FILE, "utf8")) as InquiryFile;

  it("covers every case", () => {
    expect(file.vectors.map((v) => v.name)).toEqual(INQUIRY_CASES.map((c) => c.name));
  });

  it("has distinct names", () => {
    expect(new Set(file.vectors.map((v) => v.name)).size).toBe(file.vectors.length);
  });

  for (const vector of file.vectors) {
    it(`coerces and validates: ${vector.name}`, () => {
      expect(inquiryVector({ name: vector.name, input: vector.input })).toEqual(vector);
    });
  }
});
