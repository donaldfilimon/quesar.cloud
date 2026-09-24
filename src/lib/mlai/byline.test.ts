import { describe, expect, it } from "vitest";

import { bylineNames } from "./byline";

describe("bylineNames", () => {
  it("returns a single name unchanged", () => {
    expect(bylineNames("MLAI Research")).toEqual(["MLAI Research"]);
  });

  it("splits on the middle dot", () => {
    expect(bylineNames("MLAI Research · WDBX Core")).toEqual(["MLAI Research", "WDBX Core"]);
  });

  it("splits on a comma", () => {
    expect(bylineNames("MLAI Research, WDBX Core")).toEqual(["MLAI Research", "WDBX Core"]);
  });

  it("splits on a mix of both separators", () => {
    expect(bylineNames("A · B, C·D,E")).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("trims whitespace around each name but keeps spaces inside it", () => {
    expect(bylineNames("  MLAI   Research  ·\tWDBX Core\n")).toEqual([
      "MLAI   Research",
      "WDBX Core",
    ]);
  });

  it("drops empty segments from doubled, leading or trailing separators", () => {
    expect(bylineNames(", A ·· B , · ")).toEqual(["A", "B"]);
  });

  it("returns an empty array for empty, blank or separator-only input", () => {
    expect(bylineNames("")).toEqual([]);
    expect(bylineNames("   ")).toEqual([]);
    expect(bylineNames(" , · ")).toEqual([]);
  });

  it("returns an empty array for null and undefined", () => {
    expect(bylineNames(null)).toEqual([]);
    expect(bylineNames(undefined)).toEqual([]);
  });
});
