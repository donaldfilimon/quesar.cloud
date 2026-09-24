import { describe, expect, it } from "vitest";
import { SITE_ORIGIN, canonicalUrl, pageHead } from "./seo";

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
