/**
 * Sitemap for the static build, generated from the prerendered pages rather
 * than kept by hand (the hand-kept list had drifted: new posts and product
 * pages were missing). Run by `publish-static.ts` over `docs/`.
 *
 * A page is listed at its own canonical URL unless it is `noindex` or renders
 * the full-page server-only notice (`data-server-only-page`), which on the
 * static host has nothing to index. `<lastmod>` comes from the page's own
 * JSON-LD `dateModified`/`datePublished`; pages without a date get none, since
 * stamping the build date would tell crawlers everything changed every build.
 */
export type SitemapPage = { loc: string; lastmod?: string };

export function sitemapEntry(html: string): SitemapPage | null {
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) return null;
  if (html.includes("data-server-only-page")) return null;
  const loc = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (!loc) return null;
  const dates = [...html.matchAll(/"(?:dateModified|datePublished)":"(\d{4}-\d{2}-\d{2})/g)].map(
    (m) => m[1],
  );
  return dates.length ? { loc, lastmod: dates.sort().at(-1) } : { loc };
}

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildSitemap(pages: readonly SitemapPage[]): string {
  const unique = [...new Map(pages.map((page) => [page.loc, page])).values()].sort((a, b) =>
    a.loc.localeCompare(b.loc),
  );
  const urls = unique.map(
    (page) =>
      `  <url><loc>${escape(page.loc)}</loc>${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ""}</url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}
