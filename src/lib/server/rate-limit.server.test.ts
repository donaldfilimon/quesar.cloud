import { afterEach, describe, expect, it, vi } from "vitest";
import { clientSubject, hit, windowStart } from "./rate-limit.server";

describe("rate-limit.server", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("aligns windows to the window size", () => {
    expect(windowStart(125_000, 60_000).getTime()).toBe(120_000);
  });

  it("allows up to max hits per window, then blocks, then resets", async () => {
    const limit = { windowMs: 60_000, max: 3 };
    const t = 1_900_000_000_000;
    const subject = `test-${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await hit("test", subject, limit, t));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[2].remaining).toBe(0);
    const next = await hit("test", subject, limit, t + 60_000);
    expect(next.allowed).toBe(true);
  }, 30_000);

  it("keys buckets independently", async () => {
    const limit = { windowMs: 60_000, max: 1 };
    const subject = `test-${Math.random()}`;
    expect((await hit("a", subject, limit)).allowed).toBe(true);
    expect((await hit("b", subject, limit)).allowed).toBe(true);
    expect((await hit("a", subject, limit)).allowed).toBe(false);
  }, 30_000);

  it("never exposes the raw client address", () => {
    const req = new Request("https://quesar.cloud/", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });
    const subject = clientSubject(req);
    expect(subject).not.toContain("203.0.113.9");
    expect(subject).toBe(clientSubject(req));
  });

  it("ignores a caller-supplied cf-connecting-ip unless Cloudflare is the trusted proxy", () => {
    vi.stubEnv("TRUSTED_PROXY", "");
    const spoofed = (value: string) =>
      new Request("https://quesar.cloud/", {
        headers: { "x-real-ip": "198.51.100.4", "cf-connecting-ip": value },
      });
    const direct = clientSubject(
      new Request("https://quesar.cloud/", { headers: { "x-real-ip": "198.51.100.4" } }),
    );
    expect(clientSubject(spoofed("1"))).toBe(direct);
    expect(clientSubject(spoofed("2"))).toBe(direct);

    vi.stubEnv("TRUSTED_PROXY", "cloudflare");
    expect(clientSubject(spoofed("1"))).not.toBe(clientSubject(spoofed("2")));
  });

  it("uses the proxy-appended (rightmost) x-forwarded-for hop, not a caller-prepended one", () => {
    const withXff = (value: string) =>
      new Request("https://quesar.cloud/", { headers: { "x-forwarded-for": value } });
    expect(clientSubject(withXff("1.1.1.1, 203.0.113.9"))).toBe(
      clientSubject(withXff("2.2.2.2, 203.0.113.9")),
    );
  });
});
