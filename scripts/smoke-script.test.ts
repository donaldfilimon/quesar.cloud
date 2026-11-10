import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("scripts/smoke.sh", () => {
  it("checks psql and openssl before starting PostgreSQL", () => {
    const script = read("scripts/smoke.sh");
    const guard = script.indexOf("command -v psql");
    expect(guard).toBeGreaterThan(-1);
    expect(script.indexOf("command -v openssl")).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(script.indexOf("$(scripts/dev-postgres.sh start"));
  });
});

describe("account deletion docs", () => {
  it.each(["server/README.md", "notes/superpowers/plans/2026-11-10-rust-server-m2.md"])(
    "%s says a complete commerce configuration is also unavailable",
    (path) => {
      const text = read(path);
      expect(text).toContain("DELETION_UNAVAILABLE");
      expect(text).toMatch(/complete/);
      expect(text).toContain("M6");
    },
  );
});
