import { describe, expect, it } from "vitest";
import { balanceCheck, buildModel, cashTieCheck, type Scenario } from "./three-statement-model";

// The demo's claim is that every projected line is derived and the balance
// sheet ties by construction. Pin that claim for every scenario.
const SCENARIOS: Scenario[] = ["downside", "base", "upside"];

describe("three-statement model", () => {
  it.each(SCENARIOS)(
    "%s: assets = liabilities + equity and CF cash = BS cash every period",
    (s) => {
      const periods = buildModel(s);
      expect(periods).toHaveLength(6);
      expect(periods[0]!.isActual).toBe(true);
      for (const p of periods) {
        expect(Math.abs(balanceCheck(p))).toBeLessThan(1e-6);
        const tie = cashTieCheck(p);
        if (p.isActual) expect(tie).toBeNull();
        else expect(Math.abs(tie!)).toBeLessThan(1e-6);
      }
    },
  );

  it("orders final-year revenue upside > base > downside", () => {
    const last = (s: Scenario) => buildModel(s).at(-1)!.revenue;
    expect(last("upside")).toBeGreaterThan(last("base"));
    expect(last("base")).toBeGreaterThan(last("downside"));
  });

  it("downside banks an NOL in its loss years and draws it down afterwards", () => {
    const d = buildModel("downside");
    expect(d[1]!.ebt).toBeLessThan(0);
    expect(d[1]!.nolBalance).toBeGreaterThan(0);
    expect(d.at(-1)!.nolBalance).toBeLessThan(Math.max(...d.map((p) => p.nolBalance)));
  });
});
