import { afterEach, expect, it, vi } from "vitest";
const probes = vi.hoisted(() => ({ hit: vi.fn(), sql: vi.fn() }));
vi.mock("@/lib/db", () => ({ getSql: async () => probes.sql }));
vi.mock("./rate-limit.server", () => ({
  hit: probes.hit,
  clientSubject: () => "fixture",
  LIMITS: { inquiry: {} },
}));
import { submitInquiry } from "./inquiries.server";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it.each(["limit", "insert"])(
  "redacts sensitive driver text from %s failure logs",
  async (stage) => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET", "");
    const error = new Error(
      "synthetic-secret-password private-inquiry-body postgres://sensitive-fixture",
    );
    probes.hit.mockReset().mockResolvedValue({ allowed: true });
    probes.sql.mockReset();
    if (stage === "limit") probes.hit.mockRejectedValue(error);
    else probes.sql.mockRejectedValue(error);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await submitInquiry(
        {
          name: "Synthetic User",
          email: "fixture@example.invalid",
          company: "",
          topic: "Services",
          message: "Synthetic inquiry text",
          turnstileToken: "",
        },
        { request: new Request("http://localhost/contact"), userId: null },
      ),
    ).toMatchObject({ ok: false, code: "unavailable" });
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("synthetic-secret-password");
    expect(log.mock.calls[0]).toEqual([
      stage === "limit" ? "Inquiry rate limit unavailable." : "Database error saving inquiry.",
    ]);
  },
);
