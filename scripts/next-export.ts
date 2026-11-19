#!/usr/bin/env node
/**
 * Finish the Next.js static export (`out/`) for a plain static host. With
 * `trailingSlash: false` Next writes `/docs` as `docs.html`; GitHub Pages and
 * `scripts/serve-static.ts` serve directories through `index.html`, so each page
 * moves to `docs/index.html`, the layout `docs/` has always had.
 * The RSC payloads (`docs.txt`, `docs/__next.*.txt`) stay where the client router
 * requests them.
 */
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { htmlFiles } from "./static-html-files.ts";

const out = join(process.cwd(), "out");
if (!existsSync(join(out, "index.html"))) {
  console.error("[next-export] out/index.html is missing; run `next build` first.");
  process.exit(1);
}

// Served as the host's 404 page, not a route.
const KEEP = new Set(["index.html", "404.html"]);

const internal404 = join(out, "_not-found.html");
const files = htmlFiles(out, "_next");
const pages = files
  .filter((file) => !KEEP.has(basename(file)) && file !== internal404)
  .map((file) => {
    const base = file.slice(0, -".html".length);
    return { file, base, destination: join(base, "index.html") };
  });

// Check every destination before changing the export. renameSync would
// otherwise silently replace an existing page.
for (const { file, base, destination } of pages) {
  const conflict = existsSync(base) && !statSync(base).isDirectory() ? base : destination;
  if (existsSync(conflict)) {
    console.error(
      `[next-export] cannot move ${relative(out, file)}: ${relative(out, conflict)} already exists.`,
    );
    process.exit(1);
  }
}

if (files.includes(internal404)) rmSync(internal404);
for (const { file, base, destination } of pages) {
  mkdirSync(base, { recursive: true });
  renameSync(file, destination);
}
console.log(`[next-export] ${pages.length} pages moved to <path>/index.html`);
