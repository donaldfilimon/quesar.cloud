import { afterEach, describe, expect, it, vi } from "vitest";
import { turnstileSiteKey, turnstileState, verifyTurnstile } from "./turnstile.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request() {
  return new Request("https://quesar.cloud/_serverFn/x", {
    headers: { "cf-connecting-ip": "203.0.113.7", "x-real-ip": "198.51.100.4" },
  });
}

describe("verifyTurnstile (ported from mlai)", () => {
  it("fails closed when the secret or hostname allowlist is absent", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "");
    expect(await verifyTurnstile(request(), "token-long-enough", "inquiry")).toBe(false);
  });

  it("accepts only a successful response with the expected action and hostname", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "quesar.cloud,www.quesar.cloud");
    vi.stubEnv("TRUSTED_PROXY", "");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ success: true, action: "inquiry", hostname: "quesar.cloud" }),
      );

    expect(await verifyTurnstile(request(), "token-long-enough", "inquiry")).toBe(true);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(String(init?.body)).toContain("remoteip=198.51.100.4");
  });

  it("sends cf-connecting-ip as remoteip only when Cloudflare is the trusted proxy", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "quesar.cloud");
    vi.stubEnv("TRUSTED_PROXY", "cloudflare");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ success: true, action: "inquiry", hostname: "quesar.cloud" }),
      );
    expect(await verifyTurnstile(request(), "token-long-enough", "inquiry")).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("remoteip=203.0.113.7");
  });

  it("rejects action and hostname mismatches", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "quesar.cloud");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ success: true, action: "login", hostname: "attacker.example" }),
    );
    expect(await verifyTurnstile(request(), "token-long-enough", "inquiry")).toBe(false);
  });

  it("rejects a too-short token without calling siteverify", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "quesar.cloud");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(await verifyTurnstile(request(), "short", "inquiry")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when siteverify is unreachable", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "quesar.cloud");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    expect(await verifyTurnstile(request(), "token-long-enough", "inquiry")).toBe(false);
  });
});

describe("turnstileState: one predicate for the widget and the server", () => {
  it("is off without a site key and secret, and exposes no key", () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET", "");
    expect(turnstileState()).toBe("off");
    expect(turnstileSiteKey()).toBeNull();
  });

  it("is misconfigured when the hostname allowlist is missing, and exposes no key", () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "");
    expect(turnstileState()).toBe("misconfigured");
    expect(turnstileSiteKey()).toBeNull();
  });

  it("is ready with key, secret and hostnames, and exposes only the public key", () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "quesar.cloud");
    expect(turnstileState()).toBe("ready");
    expect(turnstileSiteKey()).toBe("site-key");
  });
});
