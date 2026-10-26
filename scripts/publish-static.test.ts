import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";

const temporary: string[] = [];
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

it.each(["", " \n\t"])(
  "refuses empty prerendered HTML before replacing the existing published site",
  (html) => {
    const dir = mkdtempSync(resolve(tmpdir(), "quesar-publish-test-"));
    temporary.push(dir);
    mkdirSync(resolve(dir, "out/contact"), { recursive: true });
    mkdirSync(resolve(dir, "docs"));
    writeFileSync(resolve(dir, "out/index.html"), "<main>Site</main>");
    writeFileSync(resolve(dir, "out/contact/index.html"), html);
    writeFileSync(resolve(dir, "docs/index.html"), "Existing published site");
    const result = spawnSync(
      process.execPath,
      [resolve(import.meta.dirname, "publish-static.ts")],
      {
        cwd: dir,
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("empty prerendered HTML");
    expect(result.stderr).toContain("contact/index.html");
    expect(readFileSync(resolve(dir, "docs/index.html"), "utf8")).toBe("Existing published site");
  },
);

it("publishes a Next export: decoded asset paths, RSC payload ignored, Pages files added", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "quesar-publish-test-"));
  temporary.push(dir);
  mkdirSync(resolve(dir, "out/_next/static/chunks/app/blog/[slug]"), { recursive: true });
  mkdirSync(resolve(dir, "out/blog/post"), { recursive: true });
  writeFileSync(resolve(dir, "out/_next/static/chunks/app/blog/[slug]/page-1.js"), "");
  writeFileSync(resolve(dir, "out/robots.txt"), "User-agent: *\nAllow: /\n");
  writeFileSync(
    resolve(dir, "out/404.html"),
    '<meta name="robots" content="noindex"/><main>404</main>',
  );
  writeFileSync(
    resolve(dir, "out/index.html"),
    '<link rel="canonical" href="https://quesar.cloud/"/>',
  );
  writeFileSync(
    resolve(dir, "out/blog/post/index.html"),
    '<link rel="canonical" href="https://quesar.cloud/blog/post"/>' +
      '<script src="/_next/static/chunks/app/blog/%5Bslug%5D/page-1.js" async=""></script>' +
      '<script>self.__next_f.push([1,"\\"/_next/static/css/escaped.css\\""])</script>',
  );
  const result = spawnSync(process.execPath, [resolve(import.meta.dirname, "publish-static.ts")], {
    cwd: dir,
    encoding: "utf8",
  });
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  expect(readFileSync(resolve(dir, "docs/CNAME"), "utf8")).toBe("quesar.cloud\n");
  expect(readFileSync(resolve(dir, "docs/.nojekyll"), "utf8")).toBe("");
  const sitemap = readFileSync(resolve(dir, "docs/sitemap.xml"), "utf8");
  expect(sitemap).toContain("<loc>https://quesar.cloud/blog/post</loc>");
  expect(sitemap).not.toContain("404");
  expect(readFileSync(resolve(dir, "docs/robots.txt"), "utf8")).toContain(
    "Sitemap: https://quesar.cloud/sitemap.xml",
  );
});
