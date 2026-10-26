#!/usr/bin/env node
/**
 * Parity check for a fresh static export (`out/`) against the published site
 * (`docs/`, what quesar.cloud serves; until the cut-over, the Vite build). Every page
 * in `docs/` must exist in `out/` with the same title, description and canonical
 * URL, and every exported page must render the site shell around real content.
 *
 *   node scripts/next-check.ts [--vite <published dir>] [--next <export dir>]   (defaults: docs, out)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index > 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const root = process.cwd();
const viteDir = resolve(root, arg("--vite", "docs"));
const nextDir = resolve(root, arg("--next", "out"));
// Next's own not-found route; `404.html` is the page that is served.
const IGNORED = new Set(["_not-found/index.html", "404/index.html"]);

function pages(dir: string): string[] {
  const walk = (current: string): string[] =>
    readdirSync(current).flatMap((name) => {
      const path = join(current, name);
      if (statSync(path).isDirectory()) return name === "_next" ? [] : walk(path);
      return name === "index.html" ? [relative(dir, path)] : [];
    });
  return walk(dir)
    .filter((page) => !IGNORED.has(page))
    .sort();
}

const decode = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

function head(page: string) {
  // Only the document head: inline SVGs carry their own <title>.
  const html = page.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
  const titles = [...html.matchAll(/<title[^>]*>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  return { titles, description: description && decode(description), canonical };
}

for (const dir of [viteDir, nextDir]) {
  if (!existsSync(join(dir, "index.html"))) {
    console.error(`[next-check] ${relative(root, dir)}/index.html is missing; build it first.`);
    process.exit(1);
  }
}

const vitePages = pages(viteDir);
const nextPages = new Set(pages(nextDir));
const problems: string[] = [];

for (const page of vitePages) {
  if (!nextPages.has(page)) {
    problems.push(`${page}: missing from the Next export`);
    continue;
  }
  const want = head(readFileSync(join(viteDir, page), "utf8"));
  const got = head(readFileSync(join(nextDir, page), "utf8"));
  if (got.titles.length !== 1) problems.push(`${page}: ${got.titles.length} <title> tags`);
  if (want.titles.at(-1) !== got.titles[0])
    problems.push(
      `${page}: title ${JSON.stringify(got.titles[0])} ≠ ${JSON.stringify(want.titles.at(-1))}`,
    );
  if (want.description !== got.description) problems.push(`${page}: description differs`);
  if (want.canonical !== got.canonical)
    problems.push(`${page}: canonical ${got.canonical} ≠ ${want.canonical}`);
}

for (const page of nextPages) {
  const html = readFileSync(join(nextDir, page), "utf8");
  if (!/<main id="main"/.test(html)) problems.push(`${page}: no site shell (<main id="main">)`);
  if (!/<h1[\s>]/.test(html)) {
    // `ssr: false` routes (showcase rooms, Quasar screens) render after hydration: an empty main is expected.
    const body = html.match(/<main id="main"[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
    if (body.replace(/<!--[^>]*-->/g, "").trim()) problems.push(`${page}: no <h1>`);
  }
}

const extra = [...nextPages].filter((page) => !vitePages.includes(page));
console.log(
  `[next-check] ${vitePages.length} published pages, ${nextPages.size} exported pages (${extra.length} only in the export: ${extra.join(", ") || "none"})`,
);
if (problems.length) {
  console.error(`[next-check] ${problems.length} problems:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("[next-check] parity holds: same pages, titles, descriptions and canonical URLs");
