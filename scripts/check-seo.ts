/**
 * SEO gate for the built static site: `node scripts/check-seo.ts [dir]`
 * (default `docs`; `out` checks a fresh export). Fails on missing or
 * over-long head metadata, malformed JSON-LD, server-only pages that are not
 * `noindex`, duplicate titles or descriptions among indexable pages, and any
 * drift between `sitemap.xml` and the indexable pages' canonical URLs.
 *
 * "Indexable" matches `sitemapEntry` in `scripts/sitemap.ts`: not `noindex`,
 * not server-only (`data-server-only-page`), and (extra here) not the 404.
 * It is re-derived from the parsed DOM rather than imported, because that
 * helper works on raw HTML text and this gate must not trust its own regexes
 * over the parser; a canonical-less indexable page is reported as a failure.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

export type PageFacts = {
  route: string;
  is404: boolean;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  ogImage: string | null;
  lang: string | null;
  h1Count: number;
  jsonLd: { value?: unknown; error?: string }[];
  serverOnly: boolean;
};

const maxDescription = 160;

function walk(node: Node, visit: (node: Element) => void) {
  if ("tagName" in node) visit(node);
  if ("childNodes" in node) for (const child of node.childNodes) walk(child, visit);
  if ("content" in node && node.content) walk(node.content as unknown as Node, visit);
}

function text(node: Element): string {
  return node.childNodes.map((child) => ("value" in child ? child.value : "")).join("");
}

export function pageFacts(html: string, route: string): PageFacts {
  const facts: PageFacts = {
    route,
    is404: route === "/404.html",
    title: null,
    description: null,
    canonical: null,
    robots: null,
    ogImage: null,
    lang: null,
    h1Count: 0,
    jsonLd: [],
    serverOnly: false,
  };
  walk(parse(html), (node) => {
    const attrs = Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
    if ("data-server-only-page" in attrs) facts.serverOnly = true;
    switch (node.tagName) {
      case "html":
        facts.lang = attrs.lang ?? null;
        break;
      case "title":
        facts.title ??= text(node).trim();
        break;
      case "h1":
        facts.h1Count++;
        break;
      case "link":
        if (attrs.rel === "canonical") facts.canonical ??= attrs.href ?? null;
        break;
      case "meta":
        if (attrs.name === "description") facts.description ??= attrs.content ?? null;
        else if (attrs.name === "robots") facts.robots ??= attrs.content ?? null;
        else if (attrs.property === "og:image") facts.ogImage ??= attrs.content ?? null;
        break;
      case "script":
        if (attrs.type === "application/ld+json") {
          try {
            facts.jsonLd.push({ value: JSON.parse(text(node)) });
          } catch (error) {
            facts.jsonLd.push({ error: error instanceof Error ? error.message : String(error) });
          }
        }
        break;
    }
  });
  return facts;
}

export function isIndexable(page: PageFacts): boolean {
  return !page.is404 && !page.serverOnly && !/noindex/i.test(page.robots ?? "");
}

export function checkSite(pages: readonly PageFacts[], sitemapLocs: readonly string[]): string[] {
  const failures: string[] = [];
  const fail = (page: PageFacts, message: string) => failures.push(`${page.route}: ${message}`);
  for (const page of pages) {
    if (!page.title) fail(page, "missing <title>");
    if (!page.description) fail(page, "missing meta description");
    else if ([...page.description].length > maxDescription)
      fail(
        page,
        `description is ${[...page.description].length} characters (max ${maxDescription})`,
      );
    if (!page.ogImage) fail(page, "missing og:image");
    if (!page.lang) fail(page, "missing <html lang>");
    if (!page.is404 && !page.canonical) fail(page, "missing canonical link");
    for (const block of page.jsonLd) if (block.error) fail(page, `invalid JSON-LD: ${block.error}`);
    if (page.serverOnly && !/noindex/i.test(page.robots ?? ""))
      fail(page, "server-only page is not noindex");
    if (isIndexable(page)) {
      if (page.jsonLd.length === 0) fail(page, "no JSON-LD");
      if (page.h1Count !== 1) fail(page, `expected exactly one <h1>, found ${page.h1Count}`);
    }
  }
  const indexable = pages.filter(isIndexable);
  for (const field of ["title", "description"] as const) {
    const seen = new Map<string, PageFacts[]>();
    for (const page of indexable) {
      const value = page[field];
      if (value) seen.set(value, [...(seen.get(value) ?? []), page]);
    }
    for (const [value, group] of seen)
      if (group.length > 1)
        failures.push(
          `duplicate ${field} "${value}" on ${group.map((page) => page.route).join(", ")}`,
        );
  }
  const listed = new Set(sitemapLocs);
  const expected = new Set(indexable.flatMap((page) => (page.canonical ? [page.canonical] : [])));
  for (const loc of [...expected].sort())
    if (!listed.has(loc)) failures.push(`sitemap is missing ${loc}`);
  for (const loc of [...listed].sort())
    if (!expected.has(loc)) failures.push(`sitemap lists non-indexable or unknown ${loc}`);
  return failures;
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "_next" ? [] : htmlFiles(path);
    return entry.name === "index.html" || entry.name === "404.html" ? [path] : [];
  });
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decodeXml(m[1].trim()));
}

function main() {
  const root = resolve(process.argv[2] ?? "docs");
  const pages = htmlFiles(root).map((file) => {
    const rel = "/" + relative(root, file).split(sep).join("/");
    const route = rel === "/404.html" ? rel : rel.replace(/index\.html$/, "");
    return pageFacts(readFileSync(file, "utf8"), route);
  });
  const sitemapFile = resolve(root, "sitemap.xml");
  const failures = existsSync(sitemapFile)
    ? checkSite(pages, sitemapLocations(readFileSync(sitemapFile, "utf8")))
    : [`sitemap.xml not found in ${root}`, ...checkSite(pages, [])];
  console.log(
    `check:seo: ${pages.length} pages, ${pages.filter(isIndexable).length} indexable, ${failures.length} failures`,
  );
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(failures.length ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
