import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Ported from mlai `src/__tests__/a11y-source.test.ts` (b6f3686).
const read = (name: string) => readFileSync(resolve(__dirname, name), "utf8");

describe("demo accessibility (source)", () => {
  it("every range input in the demos has an accessible name", () => {
    for (const file of ["cosine-sim-demo.tsx", "sharding-latency-demo.tsx"]) {
      const inputs = read(file).match(/<input[\s\S]*?\/>/g) ?? [];
      expect(inputs.length, file).toBeGreaterThan(0);
      for (const input of inputs) expect(input, file).toMatch(/\b(id=|aria-label=|aria-labelledby=)/);
    }
  });

  it("the sharding and partition labels keep their model-not-product framing visible", () => {
    expect(read("sharding-latency-demo.tsx")).toContain("not a WDBX");
    expect(read("wdbx-live-demo.tsx")).toContain("modeled partition");
  });
});
