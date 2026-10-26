# SEO pass for quesar.cloud (2026-10-26)

## Intent

Donald asked to "optimize better for SEO" and finish it. Chosen goal: publish the Next.js
static export live and make its technical SEO excellent, measured page by page, with a
gate that keeps it that way. Copy stays under the site's claim discipline: no new
capability claims; any rewritten description restates what the page's own record says.

## Baseline (audit of a fresh `build:static`, 141 pages, sitemap 130)

Already correct: every page has a title, description, canonical URL (except the 404,
by design), Open Graph image and `lang`; `robots.txt`, a generated sitemap with
`lastmod` from page dates, RSS, per-section OG cards, JSON-LD on detail pages.

Gaps:

1. Six sign-in pages render the server-only notice but carry no `noindex`
   (`/login`, `/signup`, `/console`, `/console/workspace`, `/dashboard`, `/profile`).
   They are already out of the sitemap; crawlers can still index them from links.
2. 80 pages have no JSON-LD: no site-wide `WebSite`/`Organization` (the home page's
   Organization is the only one), no `BreadcrumbList`, no list markup on index pages.
3. Metadata quality: 14 descriptions over 160 characters, 25 under 70, three
   duplicated across overview/implementation-guide pairs; 9 titles under 15 characters.
4. Ten client-only (`ssr: false`) or app routes ship static HTML with no `<h1>`.
5. Nothing enforces any of this; it can regress silently.

## Design

- **Indexing.** The full-page `ServerOnlyNotice` emits `<meta name="robots"
  content="noindex">` (React hoists it). Private app routes (`/console`,
  `/console/workspace`, `/dashboard`, `/profile`) declare `noindex` in their `head()` in
  both builds. Existing deliberate `noindex` pages stay as they are.
- **Site-wide structured data.** `rootHead` carries one `@graph` with a `WebSite`
  and the `Organization` (stable `@id`s, the home page's `sameAs` list moved there);
  the home route stops emitting its own copy. `HeadTags` adds a `BreadcrumbList` on
  every non-root page with a canonical URL: Home, the section (labelled from the site
  navigation, else title-cased), then the page title without the brand suffix.
- **Index pages.** `/blog`, `/research`, `/docs`, `/products`, `/projects` and `/team`
  emit `CollectionPage` with an `ItemList` of their items' canonical URLs, built from
  the same content modules the pages render.
- **Metadata.** `pageHead` clamps the meta/OG/Twitter description to 160 characters at
  a word boundary with an ellipsis (page copy is untouched) and suffixes titles shorter
  than 30 characters that do not name Quesar or MLAI with ` · Quesar`. The three
  duplicate descriptions get distinct ones from their own records; short descriptions
  are extended only from text already in the page's record.
- **Headings.** Client-only routes render a visually hidden `<h1>` (the route title) in
  the static HTML when the page itself has none; pages that already render an `<h1>`
  after hydration do not get a second one.
- **llms.txt.** `scripts/publish-static.ts` writes `/llms.txt` from the built pages
  (`scripts/llms-txt.ts`): exactly the sitemap's pages, each with its own title and
  meta description, its publication date and a `historical` note for superseded
  posts. The first version (a force-static route over the search catalog) shipped
  in #45 and failed a later claims audit: the catalog's short hints drop the status
  wording and dates the pages carry (e.g. "Large model that trains and improves
  Abbey" for a page marked partial). It was replaced the same day; `check:seo`
  fails when `llms.txt` is missing, empty, or links a page the sitemap does not list.
- **Gate.** `scripts/check-seo.ts` (`bun run check:seo [dir]`) checks a built site:
  title/description/canonical/og:image/lang present; descriptions ≤160; valid JSON-LD
  on every indexable page; exactly one `<h1>` on indexable pages; server-only pages are
  `noindex`; the sitemap equals the indexable canonical set; no duplicate titles or
  descriptions among indexable pages. Pure functions are unit-tested; the publish
  recipe runs it after `build:static`.

## Out of scope

Article title rewrites (long article titles stay; SERPs truncate them), performance
budget changes, a server-build sitemap, new copy or capability claims.

## Verification

`bun run check` (known pre-existing failures: `tsconfig.migration.json` evidence and
the WDBX-dependent commerce test), `build:static`, `check:static`, `check:seo`,
`test:e2e`, then the publish recipe's page-by-page comparison and two-commit landing.
