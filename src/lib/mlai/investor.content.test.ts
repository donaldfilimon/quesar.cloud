import { describe, expect, it } from "vitest";

import { integrityRules } from "@/lib/mlai/categories/site-copy";
import { site } from "@/lib/site-identity";

import { about, companyIdentity } from "./categories/about";
import { investor } from "./categories/investor";

const fact = (k: string) => about.companyFacts.find((row) => row.k === k)?.v;

describe("company identity has one source", () => {
  it("describes a brand and proposed business without asserting registration", () => {
    expect(about.companyFacts).toStrictEqual([
      { k: "Brand", v: "MLAI" },
      { k: "Focus", v: "Founder-led AI engineering" },
      { k: "Languages", v: "Rust, Swift, TypeScript" },
      { k: "Model", v: "Proposed SDK licensing + integration services" },
    ]);
    expect(companyIdentity.legalName).toBe(site.company);
    expect(fact("Brand")).toBe(site.company);
    expect(site.legal).toBe(site.company);
    expect(fact("Legal name")).toBeUndefined();
    expect(fact("Entity")).toBeUndefined();
  });

  it("derives investor orientation from the shared brand and focus", () => {
    expect(investor.entity).toBe(`${fact("Focus")} · ${fact("Brand")}`);
    expect(investor.entity).not.toMatch(/Delaware|C-Corp|Inc\./);
  });

  it("states the proposed business model and illustrates market assumptions", () => {
    const som = investor.market.find((row) => row.k === "SOM")?.note ?? "";
    for (const text of [som, companyIdentity.model, fact("Model") ?? ""]) {
      expect(text).toMatch(/proposed/i);
      expect(text).toContain("SDK licensing");
      expect(text).toContain("integration services");
    }
    for (const row of investor.market) {
      expect(row.note).toMatch(/Illustrative planning assumption/);
      expect(row.note).toMatch(/not validated/);
      expect(row.tag).toBe("target");
    }
    expect(investor.raise.round).toContain("Illustrative");
  });

  it("keeps source reports distinct from operating results and GPU forecasts", () => {
    expect(investor.unit).toHaveLength(3);
    for (const row of investor.unit) expect(row.tag).toBe("target");
    expect(investor.founder.map((row) => row.tag)).toEqual(["reported", "reported", "target"]);
    expect(investor.founder[0]?.k).toContain("not deployment acceptance");
    expect(investor.founder[1]?.k).toContain("not a model-quality result");
    expect(JSON.stringify([...investor.unit, ...investor.founder])).not.toMatch(/295/);
  });

  it("the Languages fact agrees with the toolchain rule (Rust runtime, no Zig-era claim)", () => {
    const toolchain = integrityRules.find((rule) => rule.title === "Toolchain facts");
    expect(toolchain?.body).toContain("nightly Rust");
    const languages = about.companyFacts.find((fact) => fact.k === "Languages")?.v;
    expect(languages).toContain("Rust");
    expect(languages).not.toMatch(/\bZig\b/);
  });
});
