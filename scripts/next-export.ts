#!/usr/bin/env node
/**
 * Finish the Next.js static export (`out/`) for a plain static host. With
 * `trailingSlash: false` Next writes `/docs` as `docs.html`; GitHub Pages and
 * `scripts/serve-static.ts` serve directories through `index.html`, so each page
 * moves to `docs/index.html`, the layout the Vite build publishes in `docs/`.
 * The RSC payloads (`docs.txt`, `docs/__next.*.txt`) stay where the client router
 * requests them.
 */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const out = join(process.cwd(), "out");
if (!existsSync(join(out, "index.html"))) {
  console.error("[next-export] out/index.html is missing; run `next build` first.");
  process.exit(1);
}

// Served as the host's 404 page, not a route.
const KEEP = new Set(["index.html", "404.html"]);

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "_next" ? [] : pages(path);
    return name.endsWith(".html") && !KEEP.has(name) ? [path] : [];
  });
}

let moved = 0;
for (const file of pages(out)) {
  const base = file.slice(0, -".html".length);
  if (relative(out, base) === "_not-found") {
    rmSync(file);
    continue;
  }
  mkdirSync(base, { recursive: true });
  renameSync(file, join(base, "index.html"));
  moved += 1;
}
console.log(`[next-export] ${moved} pages moved to <path>/index.html`);
