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
    mkdirSync(resolve(dir, ".output/public/contact"), { recursive: true });
    mkdirSync(resolve(dir, "docs"));
    writeFileSync(resolve(dir, ".output/public/index.html"), "<main>Site</main>");
    writeFileSync(resolve(dir, ".output/public/contact/index.html"), html);
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
