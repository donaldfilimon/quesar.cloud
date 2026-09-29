import { describe, expect, it } from "vitest";
import { buildSitemap, sitemapEntry } from "./sitemap.ts";

const page = (head: string, body = "") => `<html><head>${head}</head><body>${body}</body></html>`;
const canonical = (path: string) => `<link rel="canonical" href="https://quesar.cloud${path}"/>`;

describe("sitemap", () => {
  it("lists a page at its canonical URL, dated by its newest JSON-LD date", () => {
    const html = page(
      canonical("/blog/post") +
        `<script type="application/ld+json">{"datePublished":"2026-06-09T00:00:00.000Z","dateModified":"2026-09-29"}</script>`,
    );
    expect(sitemapEntry(html)).toEqual({
      loc: "https://quesar.cloud/blog/post",
      lastmod: "2026-09-29",
    });
  });

  it("gives an undated page no lastmod rather than the build date", () => {
    expect(sitemapEntry(page(canonical("/about")))).toEqual({ loc: "https://quesar.cloud/about" });
  });

  it("skips noindex pages, server-only pages and pages without a canonical", () => {
    expect(
      sitemapEntry(page(canonical("/admin") + `<meta name="robots" content="noindex"/>`)),
    ).toBeNull();
    expect(sitemapEntry(page(canonical("/profile"), `<div data-server-only-page="">`))).toBeNull();
    expect(sitemapEntry(page(""))).toBeNull();
  });

  it("emits each URL once, sorted", () => {
    const xml = buildSitemap([
      { loc: "https://quesar.cloud/b" },
      { loc: "https://quesar.cloud/a", lastmod: "2026-09-29" },
      { loc: "https://quesar.cloud/b" },
    ]);
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml.indexOf("/a<")).toBeLessThan(xml.indexOf("/b<"));
    expect(xml).toContain("<lastmod>2026-09-29</lastmod>");
  });
});
