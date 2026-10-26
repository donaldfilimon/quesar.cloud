import { describe, expect, it } from "vitest";
import { research } from "./categories/research";
import { clampDescription, extendDescription } from "../seo";

const bySlug = (slug: string) => {
  const paper = research.publications.find((item) => item.slug === slug);
  if (!paper) throw new Error(`missing ${slug}`);
  return paper;
};

describe("research overview and implementation-guide descriptions", () => {
  for (const topic of ["gpu", "mcp", "tui"]) {
    it(`${topic}: the guide's description differs from the overview's and names the guide`, () => {
      const overview = bySlug(`${topic}-overview`);
      const guide = bySlug(`${topic}-implementation-guide`);
      expect(guide.abstract).not.toBe(overview.abstract);
      expect(guide.abstract.startsWith("Implementation guide:")).toBe(true);
      expect(guide.abstract.length).toBeGreaterThanOrEqual(70);
      expect(guide.abstract.length).toBeLessThanOrEqual(160);
      // Built only from text already in the record: the old abstract is kept whole.
      expect(guide.abstract.endsWith(overview.abstract)).toBe(true);
    });
  }

  it("no two research records share a meta description", () => {
    const seen = new Map<string, string>();
    for (const paper of research.publications) {
      const d = clampDescription(extendDescription(paper.abstract, paper.practicalSummary));
      expect(seen.get(d), `${paper.slug} duplicates ${seen.get(d)}`).toBeUndefined();
      seen.set(d, paper.slug);
    }
  });
});

describe("extendDescription", () => {
  it("extends only a thin description, and only when extra text exists", () => {
    expect(extendDescription("Short.", "More text.")).toBe("Short. More text.");
    expect(extendDescription("Short.", undefined)).toBe("Short.");
    const long = "x".repeat(70);
    expect(extendDescription(long, "More text.")).toBe(long);
  });
});
