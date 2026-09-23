import { afterEach, describe, expect, it, vi } from "vitest";
import { getSql } from "@/lib/db";
import { coerceInquiryInput, validateInquiry, type InquiryInput } from "@/lib/inquiry-rules";
import { submitInquiry } from "./inquiries.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function input(overrides: Partial<InquiryInput> = {}): InquiryInput {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    company: "",
    topic: "Quesar",
    message: "I would like to talk about WDBX provenance.",
    turnstileToken: "",
    ...overrides,
  };
}

/** Each test gets its own client address, so rate-limit windows never collide. */
function request(): Request {
  return new Request("https://quesar.cloud/_serverFn/x", {
    method: "POST",
    headers: {
      "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}-${Math.random()}`,
    },
  });
}

async function rowsFor(email: string) {
  const sql = await getSql();
  return sql<{ user_id: string | null; name: string; project_type: string; company: string }>`
    select user_id, name, project_type, company from inquiries where email = ${email}`;
}

describe("validateInquiry (mlai minimums plus /contact caps)", () => {
  it("accepts a complete inquiry and trims fields", () => {
    const result = validateInquiry(input({ name: "  Ada  ", message: "  a real message here  " }));
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Ada",
        email: "ada@example.com",
        company: "",
        topic: "Quesar",
        message: "a real message here",
      },
    });
  });

  it.each([
    ["name too short", { name: "A" }, "name"],
    ["name too long", { name: "x".repeat(81) }, "name"],
    ["email without @", { email: "not-an-email" }, "email"],
    ["email too long", { email: `${"a".repeat(120)}@example.com` }, "email"],
    ["company too long", { company: "c".repeat(121) }, "company"],
    ["unknown topic", { topic: "Crypto" }, "topic"],
    ["message too short", { message: "short" }, "message"],
    ["message too long", { message: "m".repeat(2001) }, "message"],
  ] as const)("rejects %s", (_label, overrides, field) => {
    const result = validateInquiry(input(overrides));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe(field);
  });

  it("coerces a hostile payload without throwing", () => {
    for (const payload of [null, 5, "str", [], { name: 42, email: {}, message: ["x"] }]) {
      const coerced = coerceInquiryInput(payload);
      expect(typeof coerced.name).toBe("string");
      expect(validateInquiry(coerced).ok).toBe(false);
    }
  });
});

describe("submitInquiry", () => {
  it("stores an anonymous inquiry with a null user id when Turnstile is off", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET", "");
    const email = `anon-${Math.random().toString(36).slice(2)}@example.com`;
    expect(
      await submitInquiry(input({ email, topic: "Services" }), {
        request: request(),
        userId: null,
      }),
    ).toEqual({
      ok: true,
    });
    expect(await rowsFor(email)).toEqual([
      { user_id: null, name: "Ada Lovelace", project_type: "Services", company: "" },
    ]);
  }, 30_000);

  it("records the user id when the caller had a session", async () => {
    const email = `user-${Math.random().toString(36).slice(2)}@example.com`;
    await submitInquiry(input({ email }), { request: request(), userId: "user-123" });
    expect((await rowsFor(email))[0]?.user_id).toBe("user-123");
  }, 30_000);

  it("returns the field error and stores nothing for an invalid inquiry", async () => {
    const email = `bad-${Math.random().toString(36).slice(2)}@example.com`;
    const result = await submitInquiry(input({ email, message: "short" }), {
      request: request(),
      userId: null,
    });
    expect(result).toMatchObject({ ok: false, code: "invalid", field: "message" });
    expect(await rowsFor(email)).toEqual([]);
  }, 30_000);

  it("allows five inquiries per client per window, then refuses", async () => {
    const req = request();
    const now = 1_950_000_000_000;
    const results = [];
    for (let i = 0; i < 6; i += 1) {
      results.push(
        await submitInquiry(input({ email: `rl-${i}-${Math.random()}@example.com` }), {
          request: req,
          userId: null,
          now,
        }),
      );
    }
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]).toMatchObject({ ok: false, code: "rate_limited" });
  }, 30_000);

  it("counts invalid submissions against the limit too", async () => {
    const req = request();
    const now = 1_960_000_000_000;
    for (let i = 0; i < 5; i += 1)
      await submitInquiry(input({ name: "" }), { request: req, userId: null, now });
    expect(await submitInquiry(input(), { request: req, userId: null, now })).toMatchObject({
      code: "rate_limited",
    });
  }, 30_000);

  it("requires a verified Turnstile token when Turnstile is configured", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "quesar.cloud");
    const email = `ts-${Math.random().toString(36).slice(2)}@example.com`;

    expect(
      await submitInquiry(input({ email }), { request: request(), userId: null }),
    ).toMatchObject({
      ok: false,
      code: "verification",
    });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ success: true, action: "inquiry", hostname: "quesar.cloud" }),
      );
    expect(
      await submitInquiry(input({ email, turnstileToken: "token-long-enough" }), {
        request: request(),
        userId: null,
      }),
    ).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(await rowsFor(email)).toHaveLength(1);
  }, 30_000);

  it("refuses rather than bypassing when the hostname allowlist is missing", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const email = `mis-${Math.random().toString(36).slice(2)}@example.com`;
    expect(
      await submitInquiry(input({ email, turnstileToken: "token-long-enough" }), {
        request: request(),
        userId: null,
      }),
    ).toMatchObject({ ok: false, code: "misconfigured" });
    expect(await rowsFor(email)).toEqual([]);
  }, 30_000);
});
