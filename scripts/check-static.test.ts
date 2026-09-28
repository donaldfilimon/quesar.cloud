import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const temporary: string[] = [];
function check(html: string, extra: Record<string, string> = {}) {
  const dir = mkdtempSync(resolve(tmpdir(), "quesar-static-test-"));
  temporary.push(dir);
  for (const [file, content] of Object.entries({
    "index.html": html,
    "docs/index.html": '<main id="ref-runtime">Reference</main>',
    "research/index.html": "<main>Research</main>",
    "developers/index.html": "<main>Developers</main>",
    ...extra,
  })) {
    const full = resolve(dir, "docs", file);
    mkdirSync(resolve(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return spawnSync(process.execPath, [resolve(import.meta.dirname, "check-static.ts")], {
    cwd: dir,
    encoding: "utf8",
  });
}
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("built-site gate", () => {
  it("checks real DOM attributes and ignores script text and external availability", () => {
    const result = check(
      '<a href="/docs#ref-runtime">Docs</a><a href="https://example.invalid">External</a><script>const text = \'<a href="/not-a-link">\';</script>',
    );
    expect(result.status, result.stderr).toBe(0);
  });
  it("rejects missing internal pages and anchors", () => {
    const result = check('<a href="/missing">Missing</a><a href="/docs#absent">Anchor</a>');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing /missing");
    expect(result.stderr).toContain("missing anchor /docs#absent");
  });
  it("rejects missing HTML and CSS assets", () => {
    const result = check('<img src="/missing.png"><link rel="stylesheet" href="/style.css">', {
      "style.css": "@font-face{font-family:demo;src:url(/missing.woff2)}",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing /missing.png");
    expect(result.stderr).toContain("missing CSS asset /missing.woff2");
  });
  it("rejects initial preload growth", () => {
    const result = check('<link rel="modulepreload" href="/one.js">'.repeat(36), {
      "one.js": "export {}",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("initial JavaScript budget exceeded");
  });
  it("validates generated search destinations and reference anchors", () => {
    const result = check("<main>Site</main>", {
      "assets/search-catalog-test.json": JSON.stringify([{ href: "/docs", hash: "missing" }]),
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing anchor /docs#missing");
  });
});
