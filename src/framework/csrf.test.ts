import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./csrf";

const at = (headers: Record<string, string>) =>
  new Request("https://quesar.cloud/api/server-fn/x", { method: "POST", headers });

describe("isSameOriginRequest", () => {
  it("follows Sec-Fetch-Site when present", () => {
    expect(isSameOriginRequest(at({ "Sec-Fetch-Site": "same-origin" }))).toBe(true);
    expect(
      isSameOriginRequest(at({ "Sec-Fetch-Site": "same-site", Origin: "https://quesar.cloud" })),
    ).toBe(false);
    expect(isSameOriginRequest(at({ "Sec-Fetch-Site": "cross-site" }))).toBe(false);
  });
  it("falls back to Origin, then Referer", () => {
    expect(isSameOriginRequest(at({ Origin: "https://quesar.cloud" }))).toBe(true);
    expect(isSameOriginRequest(at({ Origin: "https://evil.example" }))).toBe(false);
    expect(isSameOriginRequest(at({ Referer: "https://quesar.cloud/console" }))).toBe(true);
    expect(isSameOriginRequest(at({ Referer: "https://quesar.cloud.evil.example/" }))).toBe(false);
  });
  it("refuses a request with no origin evidence", () => {
    expect(isSameOriginRequest(at({}))).toBe(false);
  });
});
