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
    expect(safeInternalPath("/login#form")).toBe("/console");
    expect(safeInternalPath("/signup")).toBe("/console");
    expect(safeInternalPath("/signup?next=%2Fprofile")).toBe("/console");
    expect(safeInternalPath("/signup/")).toBe("/console");
    expect(safeInternalPath("/signup#form")).toBe("/console");
    expect(safeInternalPath("/loginx")).toBe("/loginx");
    expect(safeInternalPath("/signupx")).toBe("/signupx");
  });

  it("rejects controls, backslashes, encoded separators and normalized auth loops", () => {
    for (const path of [
      "/\t/attacker.example",
      "/\n/attacker.example",
      "/\r/attacker.example",
      "/console\u0000",
      "/console\u007f",
      "/docs\\../login",
      "/%2f/attacker.example",
      "/%5cattacker.example",
      "/%09/attacker.example",
      "/docs/../login",
      "/docs/%2e%2e/signup",
      "/%6cogin",
      "/%73ignup",
      "/LOGIN",
      "/docs/../api/auth",
      "/docs/../auth/callback",
      "/broken%zz",
    ])
      expect(safeInternalPath(path)).toBe("/console");
    const decoded = new URLSearchParams("next=%2F%09%2Fattacker.example").get("next")!;
    expect(new URL(decoded, "https://quesar.cloud").origin).toBe("https://attacker.example");
    expect(safeInternalPath(decoded)).toBe("/console");
  });

  it("returns canonical safe paths while preserving ordinary query and fragment intent", () => {
    expect(safeInternalPath("/docs/../profile?tab=sessions#devices")).toBe(
      "/profile?tab=sessions#devices",
    );
    expect(safeInternalPath("/console?next=https%3A%2F%2Fexample.invalid#notes")).toBe(
      "/console?next=https%3A%2F%2Fexample.invalid#notes",
    );
    expect(safeInternalPath("/contact?service=Private AI Deployment")).toBe(
      "/contact?service=Private%20AI%20Deployment",
    );
  });

  it("rejects canonical targets that dot normalization makes protocol-relative", () => {
    const base = "https://quesar.cloud";
    for (const path of [
      "/docs/..//attacker.example",
      "/.//attacker.example",
      "/docs/%2e%2e//attacker.example",
      "/docs/%2E%2E//attacker.example",
      "/%2e//attacker.example",
      "/docs/..//quesar.cloud",
      "/docs/..///attacker.example/path?tab=notes#section",
    ]) {
      const parsed = new URL(path, base);
      expect(parsed.origin).toBe(base);
      expect(parsed.pathname.startsWith("//")).toBe(true);
      const result = safeInternalPath(path);
      expect(result).toBe("/console");
      expect(new URL(result, base).origin).toBe(base);
    }
    expect(safeInternalPath("/docs//architecture?tab=source#evidence")).toBe(
      "/docs//architecture?tab=source#evidence",
    );
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
