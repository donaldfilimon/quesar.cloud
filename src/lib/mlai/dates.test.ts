import { describe, expect, it } from "vitest";
import { parseContentDate, toIsoDate } from "./dates";

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

  it("reads every format as midnight UTC, whatever zone the build runs in", () => {
    expect(toIsoDate("June 9, 2026")).toBe("2026-06-09T00:00:00.000Z");
    expect(toIsoDate("SEPTEMBER 2026")).toBe("2026-09-01T00:00:00.000Z");
    expect(toIsoDate("2026-09-23")).toBe("2026-09-23T00:00:00.000Z");
  });

  it("toIsoDate mirrors parseContentDate but as an ISO string", () => {
    const iso = toIsoDate("June 9, 2026");
    expect(iso).toBeDefined();
    expect(() => new Date(iso as string).toISOString()).not.toThrow();
    expect(toIsoDate("not a date")).toBeUndefined();
  });

  it("parses full ISO timestamps and zoned strings as written", () => {
    expect(toIsoDate("2026-06-09T12:30:00.000Z")).toBe("2026-06-09T12:30:00.000Z");
    expect(toIsoDate("2026-06-09T12:30:00+02:00")).toBe("2026-06-09T10:30:00.000Z");
    expect(toIsoDate("June 9, 2026 GMT")).toBe("2026-06-09T00:00:00.000Z");
  });
});
