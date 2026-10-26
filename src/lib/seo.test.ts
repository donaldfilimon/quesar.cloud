import { describe, expect, it } from "vitest";
import { SITE_ORIGIN, canonicalUrl, clampDescription, pageHead, seoTitle } from "./seo";

describe("canonicalUrl", () => {
  it("keeps the trailing slash on the root", () => {
    expect(canonicalUrl("/")).toBe(`${SITE_ORIGIN}/`);
  });

  it("falls back to the root for an empty pathname", () => {
    expect(canonicalUrl("")).toBe(`${SITE_ORIGIN}/`);
  });

  it("collapses a slashes-only pathname to the root", () => {
    expect(canonicalUrl("//")).toBe(`${SITE_ORIGIN}/`);
    expect(canonicalUrl("///")).toBe(`${SITE_ORIGIN}/`);
  });

  it("strips trailing slashes from non-root paths", () => {
    expect(canonicalUrl("/blog/")).toBe(`${SITE_ORIGIN}/blog`);
    expect(canonicalUrl("/blog//")).toBe(`${SITE_ORIGIN}/blog`);
  });

  it("leaves paths without a trailing slash unchanged", () => {
    expect(canonicalUrl("/research")).toBe(`${SITE_ORIGIN}/research`);
  });

  it("keeps nested paths intact", () => {
    expect(canonicalUrl("/quasar/site/abc-123")).toBe(`${SITE_ORIGIN}/quasar/site/abc-123`);
    expect(canonicalUrl("/docs/getting-started/")).toBe(`${SITE_ORIGIN}/docs/getting-started`);
  });

  it("is always an absolute https URL on the site origin", () => {
    expect(SITE_ORIGIN).toBe("https://quesar.cloud");
    expect(new URL(canonicalUrl("/about")).origin).toBe(SITE_ORIGIN);
  });
});

describe("pageHead", () => {
  const title = "Research — Quesar";
  const description = "Papers & notes on <models>.";
  const { meta } = pageHead(title, description);

  it("sets the document title and description", () => {
    expect(meta).toContainEqual({ title });
    expect(meta).toContainEqual({ name: "description", content: description });
  });

  it("mirrors title and description into Open Graph tags", () => {
    expect(meta).toContainEqual({ property: "og:title", content: title });
    expect(meta).toContainEqual({ property: "og:description", content: description });
  });

  it("mirrors title and description into Twitter tags", () => {
    expect(meta).toContainEqual({ name: "twitter:title", content: title });
    expect(meta).toContainEqual({ name: "twitter:description", content: description });
  });

  it("emits exactly those six entries and leaves site-wide defaults to the root route", () => {
    expect(meta).toHaveLength(6);
    const keys = meta.map((m) => ("property" in m ? m.property : "name" in m ? m.name : "title"));
    expect(keys).not.toContain("og:image");
    expect(keys).not.toContain("og:url");
    expect(keys).not.toContain("twitter:card");
  });
});

describe("clampDescription", () => {
  it("leaves text of at most 160 characters unchanged", () => {
    const exact = "a".repeat(160);
    expect(clampDescription(exact)).toBe(exact);
    expect(clampDescription("Short text.")).toBe("Short text.");
  });

  it("cuts long text at a word boundary and ends with an ellipsis", () => {
    const text = "word ".repeat(60).trim();
    const out = clampDescription(text);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
    expect(out.slice(0, -1).endsWith("word")).toBe(true);
  });

  it("never leaves trailing punctuation or space before the ellipsis", () => {
    const text = `${"alpha beta ".repeat(14)}gamma, delta epsilon zeta eta theta iota kappa`;
    const out = clampDescription(text, 140);
    expect(out.length).toBeLessThanOrEqual(140);
    expect(out).toMatch(/[^\s,;:.\-–—]…$/);
  });

  it("does not cut mid-word", () => {
    const out = clampDescription("one two three four five", 14);
    expect(out).toBe("one two three…");
  });
});

describe("seoTitle", () => {
  it("adds the brand suffix to a short brandless title", () => {
    expect(seoTitle("Blog")).toBe("Blog · Quesar");
  });

  it("leaves titles that already carry the brand unchanged", () => {
    expect(seoTitle("Team — Quesar")).toBe("Team — Quesar");
    expect(seoTitle("Abbey — MLAI")).toBe("Abbey — MLAI");
  });

  it("leaves titles of 30 characters or more unchanged", () => {
    const long = "x".repeat(30);
    expect(seoTitle(long)).toBe(long);
  });
});

describe("pageHead metadata rules", () => {
  it("applies seoTitle to title, og:title and twitter:title", () => {
    const { meta } = pageHead("Blog", "A description that is fine.");
    expect(meta).toContainEqual({ title: "Blog · Quesar" });
    expect(meta).toContainEqual({ property: "og:title", content: "Blog · Quesar" });
    expect(meta).toContainEqual({ name: "twitter:title", content: "Blog · Quesar" });
  });

  it("applies clampDescription to description, og and twitter", () => {
    const long = "word ".repeat(60).trim();
    const clamped = clampDescription(long);
    const { meta } = pageHead("Research — Quesar", long);
    expect(meta).toContainEqual({ name: "description", content: clamped });
    expect(meta).toContainEqual({ property: "og:description", content: clamped });
    expect(meta).toContainEqual({ name: "twitter:description", content: clamped });
  });
});
