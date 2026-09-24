import { describe, expect, it } from "vitest";
import { internalHref, isAbsoluteUrl, isExternal, safeInternalPath } from "./internal";

describe("safeInternalPath", () => {
  it("keeps ordinary internal paths", () => {
    expect(safeInternalPath("/profile")).toBe("/profile");
    expect(safeInternalPath("/console?tab=chat")).toBe("/console?tab=chat");
  });

  it("refuses external, protocol-relative and API targets", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil",
      "/api/auth/x",
      "/auth/popup",
    ]) {
      expect(safeInternalPath(bad)).toBe("/console");
    }
  });

  it("never sends the visitor back into the sign-in page (nested ?next= loop)", () => {
    expect(safeInternalPath("/login")).toBe("/console");
    expect(safeInternalPath("/login?next=%2Fprofile")).toBe("/console");
    expect(safeInternalPath("/loginx")).toBe("/loginx");
  });
});

describe("internalHref", () => {
  it("maps site URLs to their path by host", () => {
    expect(internalHref("https://quesar.cloud/docs/deployment#gate")).toBe("/docs/deployment#gate");
    expect(internalHref("https://www.quesar.cloud/")).toBe("/");
  });

  it("does not treat a GitHub URL that names the repo as a site URL", () => {
    const href = "https://github.com/donaldfilimon/quesar.cloud";
    expect(internalHref(href)).toBe("/developers");
    expect(isExternal("https://example.com/quesar.cloud")).toBe(true);
  });
});

describe("isAbsoluteUrl", () => {
  it("separates absolute URLs from site routes", () => {
    expect(isAbsoluteUrl("https://github.com/donaldfilimon/abi")).toBe(true);
    expect(isAbsoluteUrl("http://example.com")).toBe(true);
    expect(isAbsoluteUrl("/developers")).toBe(false);
    expect(isAbsoluteUrl("mailto:hi@example.com")).toBe(false);
  });
});
