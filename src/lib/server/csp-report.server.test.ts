import { afterEach, describe, expect, it, vi } from "vitest";
import { CSP_LOG_LIMIT, handleCspReport } from "./csp-report.server";

afterEach(() => vi.restoreAllMocks());

function report(body: string, ip = `203.0.113.${Math.random()}`): Request {
  return new Request("https://quesar.cloud/api/csp-report", {
    method: "POST",
    headers: { "content-type": "application/csp-report", "x-forwarded-for": ip },
    body,
  });
}

describe("handleCspReport", () => {
  it("logs a legacy report-uri body to stdout and answers 204", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const body = JSON.stringify({ "csp-report": { "violated-directive": "script-src", "blocked-uri": "https://x.test" } });
    const res = await handleCspReport(report(body));
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledWith("[CSP] violation report:", body);
  }, 30_000);

  it("accepts a Reporting API batch (an array) and truncates the log line", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const body = JSON.stringify([{ type: "csp-violation", body: { blockedURL: "x".repeat(5000) } }]);
    expect((await handleCspReport(report(body))).status).toBe(204);
    expect((warn.mock.calls[0]?.[1] as string).length).toBe(CSP_LOG_LIMIT);
  }, 30_000);

  it("answers 413 for a body over 64 KB", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await handleCspReport(report("x".repeat(65 * 1024)))).status).toBe(413);
  }, 30_000);

  it("allows 60 reports per client per minute, then answers 429 without logging", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ip = `203.0.113.${Math.random()}`;
    const now = 1_980_000_000_000;
    const statuses: number[] = [];
    for (let i = 0; i < 61; i += 1) statuses.push((await handleCspReport(report("{}", ip), now)).status);
    expect(statuses.slice(0, 60).every((status) => status === 204)).toBe(true);
    expect(statuses[60]).toBe(429);
    expect(warn).toHaveBeenCalledTimes(60);
  }, 60_000);
});
