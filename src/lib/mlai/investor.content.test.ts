import { describe, expect, it } from "vitest";

import { integrityRules } from "@/lib/content";
import { site } from "@/lib/site-identity";

import { about, companyIdentity } from "./categories/about";
import { investor } from "./categories/investor";

const fact = (k: string) => about.companyFacts.find((row) => row.k === k)?.v;

describe("company identity has one source", () => {
  it("companyFacts render the same values as before the split", () => {
    expect(about.companyFacts).toStrictEqual([
      { k: "Legal name", v: "Machine Learning Advanced Innovations, Inc." },
      { k: "Entity", v: "Delaware C-Corp" },
      { k: "Location", v: "Orlando, FL" },
      { k: "Languages", v: "Zig, Swift, TypeScript" },
      { k: "Model", v: "SDK licensing + integration services" },
    ]);
  });

  it("the legal name is site.legal everywhere", () => {
    expect(companyIdentity.legalName).toBe(site.legal);
    expect(fact("Legal name")).toBe(site.legal);
    expect(investor.entity).toContain(site.legal);
  });

  it("investor.entity is derived from companyIdentity, byte-identical to its old literal", () => {
    expect(investor.entity).toBe("Delaware C-Corp · Machine Learning Advanced Innovations, Inc.");
    expect(investor.entity).toBe(`${fact("Entity")} · ${fact("Legal name")}`);
  });

  it("the SOM note and the company model describe the same business", () => {
    const som = investor.market.find((row) => row.k === "SOM")?.note ?? "";
    for (const text of [som, companyIdentity.model, fact("Model") ?? ""]) {
      expect(text).toContain("SDK licensing");
      expect(text).toContain("integration services");
    }
  });

  it("the GPU target figure is the same string in every investor row and always tagged target", () => {
    const rows = [...investor.unit, ...investor.founder].filter((row) => row.k.includes("295"));
    expect(rows.map((row) => row.k)).toEqual(["GPU 295×", "295× GPU figure"]);
    for (const row of rows) expect(row.tag).toBe("target");
  });

  it("the toolchain rule the Languages fact currently conflicts with still exists", () => {
    const toolchain = integrityRules.find((rule) => rule.title === "Toolchain facts");
    expect(toolchain?.body).toContain("nightly Rust");
  });

  // TODO(copy-wave): companyFacts "Languages: Zig, Swift, TypeScript" contradicts
  // integrityRules "Toolchain facts" (ABI is nightly Rust; no Zig-era claims)
  // and the Rust runtime stated on /about and in benchmark copy. Fix the copy,
  // then turn this into a real assertion (no "Zig" in companyFacts).
  it.todo("companyFacts Languages agrees with integrityRules Toolchain facts (no Zig-era claim)");
});
