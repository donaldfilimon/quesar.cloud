#!/usr/bin/env node
/**
 * Publish the static GitHub Pages build (`bun run build:static`).
 *
 * Copies the Next.js static export from `out/` (after `scripts/next-export.ts`
 * has moved each page to `<path>/index.html`) into `docs/` (the Pages source:
 * branch `main`, folder `/docs`), then adds what Pages needs: `.nojekyll` (serve
 * the `_next/` directory and `.md` paths verbatim), `CNAME`, and `sitemap.xml` and
 * `llms.txt` generated from the pages (`./sitemap.ts`, `./llms-txt.ts`). The
 * export's own `404.html` is the
 * Pages 404. `docs/` holds ONLY the built site; internal records live in `notes/`.
 */
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { site } from "../src/lib/site-identity.ts";
import { buildLlmsTxt, llmsPage } from "./llms-txt.ts";
import { buildSitemap, sitemapEntry } from "./sitemap.ts";

const root = process.cwd();
const src = join(root, "out");
const out = join(root, "docs");
const DOMAIN = "quesar.cloud";

if (!existsSync(join(src, "index.html"))) {
  console.error("[publish-static] out/index.html is missing; run the static build first.");
  process.exit(1);
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}
const empty = htmlFiles(src).filter((file) => !readFileSync(file, "utf8").trim());
if (empty.length) {
  console.error(
    `[publish-static] empty prerendered HTML:\n  ${empty.map((file) => relative(src, file)).join("\n  ")}`,
  );
  process.exit(1);
}
if (!existsSync(join(src, "404.html"))) {
  console.error("[publish-static] out/404.html is missing; the export must include the 404 page.");
  process.exit(1);
}

const missing = new Set<string>();
for (const file of htmlFiles(src)) {
  const html = readFileSync(file, "utf8");
  // Attribute references only: the inline RSC payload repeats them JSON-escaped.
  for (const [, raw] of html.matchAll(/(?:src|href)="\/_next\/static\/([^"?#]+)"/g)) {
    const asset = decodeURIComponent(raw);
    if (!existsSync(join(src, "_next", "static", asset)))
      missing.add(`${asset} (in ${relative(src, file)})`);
  }
}
if (missing.size) {
  console.error(`[publish-static] referenced assets not found:\n  ${[...missing].join("\n  ")}`);
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");
writeFileSync(join(out, "CNAME"), `${DOMAIN}\n`);
const builtPages = htmlFiles(out).map((file) => readFileSync(file, "utf8"));
const sitemap = builtPages.flatMap((html) => {
  const entry = sitemapEntry(html);
  return entry ? [entry] : [];
});
writeFileSync(join(out, "sitemap.xml"), buildSitemap(sitemap));
const llms = builtPages.flatMap((html) => {
  const page = llmsPage(html);
  return page ? [page] : [];
});
writeFileSync(join(out, "llms.txt"), buildLlmsTxt(llms, site.name));
writeFileSync(
  join(out, "robots.txt"),
  `${readFileSync(join(out, "robots.txt"), "utf8").trimEnd()}\n\nSitemap: https://${DOMAIN}/sitemap.xml\n`,
);
console.log(`[publish-static] sitemap.xml lists ${sitemap.length} pages`);
console.log(`[publish-static] llms.txt lists ${llms.length} pages`);
console.log(`[publish-static] docs/ ready for ${DOMAIN}`);
