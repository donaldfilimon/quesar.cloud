import { describe, expect, it } from "vitest";
import { checkSite, pageFacts, sitemapLocations } from "./check-seo.ts";

type Options = {
  route?: string;
  head?: string;
  body?: string;
  lang?: string | null;
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  ogImage?: boolean;
  robots?: string;
  jsonLd?: string | null;
  h1?: number;
};

function page(o: Options = {}) {
  const route = o.route ?? "/a/";
  const canonical = o.canonical === undefined ? `https://quesar.cloud${route}` : o.canonical;
  const lang = o.lang === undefined ? "en" : o.lang;
  const title = o.title === undefined ? `Title ${route}` : o.title;
  const description = o.description === undefined ? `Description ${route}` : o.description;
  const jsonLd = o.jsonLd === undefined ? '{"@context":"https://schema.org"}' : o.jsonLd;
  const html = `<!doctype html><html${lang ? ` lang="${lang}"` : ""}><head>
${title === null ? "" : `<title>${title}</title>`}
${description === null ? "" : `<meta name="description" content="${description}">`}
${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
${o.ogImage === false ? "" : '<meta property="og:image" content="https://quesar.cloud/og/x.jpg">'}
${o.robots ? `<meta name="robots" content="${o.robots}">` : ""}
${jsonLd === null ? "" : `<script type="application/ld+json">${jsonLd}</script>`}
${o.head ?? ""}</head><body>${"<h1>Heading</h1>".repeat(o.h1 ?? 1)}${o.body ?? ""}</body></html>`;
  return pageFacts(html, route);
}

const sitemap = (...pages: ReturnType<typeof page>[]) => pages.map((p) => p.canonical!);

describe("check-seo", () => {
  it("passes a clean site", () => {
    const a = page();
    const b = page({ route: "/b/" });
    const notFound = page({
      route: "/404.html",
      canonical: null,
      robots: "noindex",
      h1: 0,
      jsonLd: null,
    });
    expect(checkSite([a, b, notFound], sitemap(a, b))).toEqual([]);
  });

  it("extracts facts", () => {
    const p = page({ body: "<p data-server-only-page></p>" });
    expect(p).toMatchObject({ lang: "en", h1Count: 1, serverOnly: true, title: "Title /a/" });
    expect(p.jsonLd).toHaveLength(1);
  });

  it.each([
    ["missing title", { title: null }, "missing <title>"],
    ["missing description", { description: null }, "missing meta description"],
    ["missing og:image", { ogImage: false }, "missing og:image"],
    ["missing lang", { lang: null }, "missing <html lang>"],
    ["missing canonical", { canonical: null }, "missing canonical"],
    ["bad JSON-LD", { jsonLd: "{nope" }, "invalid JSON-LD"],
    ["no JSON-LD", { jsonLd: null }, "no JSON-LD"],
    ["no h1", { h1: 0 }, "exactly one <h1>, found 0"],
    ["two h1", { h1: 2 }, "exactly one <h1>, found 2"],
    ["long description", { description: "x".repeat(161) }, "161 characters"],
  ] as [string, Options, string][])("flags %s", (_name, options, message) => {
    const p = page(options);
    expect(checkSite([p], p.canonical ? [p.canonical] : []).join("\n")).toContain(message);
  });

  it("measures description after entity decoding", () => {
    const p = page({ description: "&amp;".repeat(160) });
    expect(checkSite([p], sitemap(p))).toEqual([]);
  });

  it("does not require a canonical on the 404", () => {
    const n = page({ route: "/404.html", canonical: null, robots: "noindex" });
    expect(checkSite([n], [])).toEqual([]);
  });

  it("flags a server-only page without noindex", () => {
    const p = page({ body: "<p data-server-only-page></p>" });
    expect(checkSite([p], [])).toContain("/a/: server-only page is not noindex");
  });

  it("does not demand JSON-LD or an h1 of noindex pages", () => {
    const p = page({ robots: "noindex, follow", jsonLd: null, h1: 0 });
    expect(checkSite([p], [])).toEqual([]);
  });

  it("flags duplicate titles and descriptions among indexable pages only", () => {
    const a = page({ title: "Same", description: "Same d" });
    const b = page({ route: "/b/", title: "Same", description: "Same d" });
    const hidden = page({ route: "/c/", title: "Same", description: "Same d", robots: "noindex" });
    const failures = checkSite([a, b, hidden], sitemap(a, b)).join("\n");
    expect(failures).toContain('duplicate title "Same" on /a/, /b/');
    expect(failures).toContain('duplicate description "Same d" on /a/, /b/');
    expect(checkSite([a, hidden], sitemap(a)).join("\n")).not.toContain("duplicate");
  });

  it("reports sitemap drift in both directions", () => {
    const a = page();
    const b = page({ route: "/b/" });
    const failures = checkSite([a, b], [a.canonical!, "https://quesar.cloud/ghost/"]);
    expect(failures).toContain("sitemap is missing https://quesar.cloud/b/");
    expect(failures).toContain(
      "sitemap lists non-indexable or unknown https://quesar.cloud/ghost/",
    );
  });

  it("decodes sitemap locations", () => {
    expect(sitemapLocations("<url><loc>https://x/?a=1&amp;b=2</loc></url>")).toEqual([
      "https://x/?a=1&b=2",
    ]);
  });

  it("reads robots and other metadata from <head> only", () => {
    const p = page({
      title: null,
      robots: undefined,
      body: '<meta name="robots" content="noindex"><title>Body</title><meta name="description" content="x">',
      description: null,
    });
    expect(p.robots).toBeNull();
    expect(p.title).toBeNull();
    expect(p.description).toBeNull();
    const hidden = page({ route: "/s/", body: "<p data-server-only-page></p>" });
    const sneaky = pageFacts(
      `<!doctype html><html lang="en"><head><title>T</title></head><body><meta name="robots" content="noindex"><p data-server-only-page></p></body></html>`,
      "/s/",
    );
    expect(sneaky.robots).toBeNull();
    expect(checkSite([hidden], []).join("\n")).toContain("server-only page is not noindex");
    expect(checkSite([sneaky], []).join("\n")).toContain("server-only page is not noindex");
  });

  describe("structured-data links", () => {
    const crumbs = (...urls: string[]) =>
      JSON.stringify({
        "@type": "BreadcrumbList",
        itemListElement: urls.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
      });
    const list = (...urls: string[]) =>
      JSON.stringify({
        "@type": "ItemList",
        itemListElement: urls.map((url, i) => ({ "@type": "ListItem", position: i + 1, url })),
      });

    it("accepts links that resolve to built pages", () => {
      const home = page({ route: "/" });
      const blog = page({ route: "/blog/" });
      const post = page({
        route: "/blog/x/",
        jsonLd: crumbs(
          "https://quesar.cloud/",
          "https://quesar.cloud/blog",
          "https://quesar.cloud/blog/x",
        ),
      });
      const index = page({ route: "/docs/", jsonLd: list("https://quesar.cloud/blog/x") });
      expect(checkSite([home, blog, post, index], sitemap(home, blog, post, index))).toEqual([]);
    });

    it("flags a breadcrumb or item-list link to a missing page", () => {
      const home = page({ route: "/" });
      const a = page({
        route: "/quasar/sites/",
        jsonLd: crumbs("https://quesar.cloud/", "https://quesar.cloud/quasar"),
      });
      const b = page({ route: "/b/", jsonLd: list("https://quesar.cloud/ghost/") });
      const failures = checkSite([home, a, b], sitemap(home, a, b));
      expect(failures).toContain(
        "structured-data link to missing page https://quesar.cloud/quasar on /quasar/sites/",
      );
      expect(failures).toContain(
        "structured-data link to missing page https://quesar.cloud/ghost/ on /b/",
      );
    });

    it("ignores off-origin links and finds links inside @graph", () => {
      const home = page({
        route: "/",
        jsonLd: JSON.stringify({
          "@graph": [
            JSON.parse(list("https://example.com/x")),
            JSON.parse(crumbs("https://quesar.cloud/nope")),
          ],
        }),
      });
      expect(checkSite([home], sitemap(home))).toEqual([
        "structured-data link to missing page https://quesar.cloud/nope on /",
      ]);
    });
  });
});
