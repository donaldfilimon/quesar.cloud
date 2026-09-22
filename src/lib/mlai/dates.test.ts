import { describe, expect, it } from "vitest";
import { parseContentDate, toIsoDate, toSitemapDate } from "./dates";

// Ported from mlai src/__tests__/dates.test.ts.
describe("dates", () => {
  it("parseContentDate accepts the content layer's human date formats", () => {
    expect(parseContentDate("June 9, 2026")).not.toBeNull();
    expect(parseContentDate("JUNE 2026")).not.toBeNull();
  });

  it("parseContentDate returns null for unparseable input", () => {
    expect(parseContentDate("not a date")).toBeNull();
    expect(parseContentDate("")).toBeNull();
  });

  it("toIsoDate mirrors parseContentDate but as an ISO string", () => {
    const iso = toIsoDate("June 9, 2026");
    expect(iso).toBeDefined();
    expect(() => new Date(iso as string).toISOString()).not.toThrow();
    expect(toIsoDate("not a date")).toBeUndefined();
  });

  it("toSitemapDate emits the bare YYYY-MM-DD form <lastmod> wants", () => {
    expect(toSitemapDate("June 9, 2026")).toBe("2026-06-09");
    expect(toSitemapDate("JUNE 2026")).toBe("2026-06-01");
    expect(toSitemapDate("DECEMBER 2025")).toBe("2025-12-01");
  });

  it("toSitemapDate returns undefined rather than substituting a date", () => {
    for (const bad of ["not a date", "", "Q1 2026", "coming soon"]) {
      expect(toSitemapDate(bad)).toBeUndefined();
    }
  });
});
