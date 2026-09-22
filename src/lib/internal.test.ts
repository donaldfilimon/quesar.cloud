import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./internal";

describe("safeInternalPath", () => {
  it("keeps ordinary internal paths", () => {
    expect(safeInternalPath("/profile")).toBe("/profile");
    expect(safeInternalPath("/console?tab=chat")).toBe("/console?tab=chat");
  });

  it("refuses external, protocol-relative and API targets", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "/api/auth/x", "/auth/popup"]) {
      expect(safeInternalPath(bad)).toBe("/console");
    }
  });

  it("never sends the visitor back into the sign-in page (nested ?next= loop)", () => {
    expect(safeInternalPath("/login")).toBe("/console");
    expect(safeInternalPath("/login?next=%2Fprofile")).toBe("/console");
    expect(safeInternalPath("/loginx")).toBe("/loginx");
  });
});
