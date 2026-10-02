import { describe, expect, it } from "vitest";
import { SYSTEM_PREAMBLE } from "./console.server";

describe("website provider instruction boundary", () => {
  it("keeps website model requests separate from experimental builder and source integration", () => {
    expect(SYSTEM_PREAMBLE).toContain("configured model provider on the Quesar website");
    expect(SYSTEM_PREAMBLE).toContain("separately running, operator-owned website-builder service");
    expect(SYSTEM_PREAMBLE).toContain("model-request path is separate from that builder");
    expect(SYSTEM_PREAMBLE).toContain("ABI, WDBX, and Abbey have their own source");
    expect(SYSTEM_PREAMBLE).toContain("Do not infer a trained Quesar foundation model");
    expect(SYSTEM_PREAMBLE).toContain(
      "Distinguish source implementation, configured operation, and deployment acceptance",
    );
    expect(SYSTEM_PREAMBLE).toContain("Never imply that an unverified target is a measured result");
    expect(SYSTEM_PREAMBLE).not.toContain("Quesar is the large model that trains and improves");
  });
});
