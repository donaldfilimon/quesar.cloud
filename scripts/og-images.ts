/**
 * `bun run og:images`: renders the per-section Open Graph cards into
 * public/og/<slug>.jpg (1200x630) from one template. Run it by hand when a
 * section's title or line changes and commit the output; the build does not
 * run it, so builds stay hermetic and need no browser.
 *
 * Uses the Playwright Chromium the e2e suite already installs, and the site's
 * own self-hosted fonts and palette (olive graphite ground, chain accent).
 */
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { OG_SECTIONS } from "../src/lib/og-sections.ts";

const font = (path: string) =>
  `data:font/woff2;base64,${readFileSync(resolve("node_modules", path)).toString("base64")}`;
const display = font(
  "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
);
const sans = font("@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2");
const mono = font("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2");

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function card(section: (typeof OG_SECTIONS)[number]): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:D;src:url(${display}) format("woff2");font-weight:300 700}
@font-face{font-family:S;src:url(${sans}) format("woff2");font-weight:100 700}
@font-face{font-family:M;src:url(${mono}) format("woff2")}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#111410;color:#eef0e8;font-family:S;position:relative;overflow:hidden}
.glow{position:absolute;inset:0;background:radial-gradient(60% 70% at 85% 20%,rgba(108,195,217,.14),transparent 70%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(238,240,232,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(238,240,232,.035) 1px,transparent 1px);background-size:48px 48px}
.wrap{position:absolute;inset:72px 80px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px;font-size:26px;color:#a9b1a0}
.brand b{color:#eef0e8;font-family:D;font-weight:600}
h1{font-family:D;font-weight:600;font-size:${section.title.length > 10 ? 104 : 132}px;line-height:.95;letter-spacing:-.035em;margin-top:auto}
p{font-size:32px;line-height:1.35;color:#a9b1a0;margin-top:28px;max-width:30ch}
.url{position:absolute;right:0;top:4px;font-family:M;font-size:22px;color:#6cc3d9}
.rule{height:2px;background:linear-gradient(90deg,#6cc3d9,transparent);margin-top:40px;width:320px}
</style></head><body><div class="glow"></div><div class="grid"></div><div class="wrap">
<div class="brand"><svg width="44" height="30" viewBox="0 0 44 30" fill="none"><polyline points="3,27 11,4 22,19 33,4 41,27" stroke="#6cc3d9" stroke-width="2.5" stroke-linejoin="round"/><g fill="#6cc3d9">${[
    [3, 27],
    [11, 4],
    [22, 19],
    [33, 4],
    [41, 27],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`)
    .join("")}</g></svg><span><b>Quesar</b> by MLAI</span></div>
<span class="url">quesar.cloud${escape(section.path)}</span>
<h1>${escape(section.title)}</h1><p>${escape(section.line)}</p><div class="rule"></div>
</div></body></html>`;
}

mkdirSync("public/og", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const section of OG_SECTIONS) {
  await page.setContent(card(section), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/og/${section.slug}.jpg`, type: "jpeg", quality: 86 });
  console.log(`[og-images] public/og/${section.slug}.jpg`);
}
await browser.close();
