import { describe, expect, it } from "vitest";
import { runtimeReadiness, readinessResponse, checkRuntimeRequest } from "./readiness.server";
const configured = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://localhost/app",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "https://example.com",
};
describe("runtime readiness", () => {
  it("fails closed for missing production requirements", () => {
    expect(runtimeReadiness({ NODE_ENV: "production" }).reasons).toEqual([
      "database_unavailable",
      "session_secret_invalid",
      "auth_origin_invalid",
    ]);
  });
  it("accepts configured production and local development", () => {
    expect(runtimeReadiness(configured).ready).toBe(true);
    expect(runtimeReadiness({}).ready).toBe(true);
  });
  it.each(["bad", "https://db.example/app", "postgres:///app"])(
    "rejects malformed database %s",
    (DATABASE_URL) => {
      expect(runtimeReadiness({ ...configured, DATABASE_URL }).reasons).toContain(
        "database_unavailable",
      );
    },
  );
  it.each([
    "http://example.com",
    "https://example.com/path",
    "https://user:pass@example.com",
    "bad",
  ])("rejects insecure or non-origin auth URL %s", (BETTER_AUTH_URL) => {
    expect(runtimeReadiness({ ...configured, BETTER_AUTH_URL }).reasons).toContain(
      "auth_origin_invalid",
    );
  });
  it("exempts static mode but never trusts runtime prerender env", () => {
    expect(runtimeReadiness({ NODE_ENV: "production", TSS_PRERENDERING: "true" }).ready).toBe(
      false,
    );
    expect(runtimeReadiness({ NODE_ENV: "production" }, true).ready).toBe(true);
  });
  it("rejects auth disabled with durable DB even in development", () => {
    expect(
      runtimeReadiness({ DATABASE_URL: configured.DATABASE_URL, VITE_AUTH_ENABLED: "false" })
        .reasons,
    ).toContain("auth_disabled_with_database");
  });
  it("reports missing and malformed optional encryption honestly without blocking baseline", () => {
    expect(runtimeReadiness(configured).optional.encryption).toBe("not_configured");
    const state = runtimeReadiness({
      ...configured,
      APP_ENCRYPTION_KEY: "bad",
      APP_ENCRYPTION_KEY_PREVIOUS: "bad",
    });
    expect(state.ready).toBe(true);
    expect(state.optional.encryption).toBe("invalid");
    expect(state.optional.previousEncryptionKey).toBe("invalid");
  });
  it("never returns URLs or secrets and prevents caching", async () => {
    const response = readinessResponse(
      runtimeReadiness({
        ...configured,
        BETTER_AUTH_SECRET: "private",
        DATABASE_URL: "secret-url",
      }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toMatch(/private|secret-url|example.com/);
  });
});

describe("incoming readiness requests", () => {
  it("refuses ordinary production requests before next handler", () => {
    const old = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(
        checkRuntimeRequest(new Request("https://site.invalid/api/auth/get-session"))?.status,
      ).toBe(503);
    } finally {
      process.env.NODE_ENV = old;
    }
  });
  it("serves HEAD readiness with safe headers and no body", async () => {
    const response = checkRuntimeRequest(
      new Request("https://site.invalid/api/readiness", { method: "HEAD" }),
      true,
    )!;
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("refuses readiness writes", () => {
    expect(
      checkRuntimeRequest(
        new Request("https://site.invalid/api/readiness", { method: "POST" }),
        true,
      )?.status,
    ).toBe(405);
  });
});
