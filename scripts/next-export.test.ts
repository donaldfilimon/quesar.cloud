import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("refuses route collisions before moving any exported pages", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "quesar-export-test-"));
  try {
    mkdirSync(resolve(dir, "out/z"), { recursive: true });
    writeFileSync(resolve(dir, "out/index.html"), "Home");
    writeFileSync(resolve(dir, "out/a.html"), "Earlier route");
    writeFileSync(resolve(dir, "out/z.html"), "Flat route");
    writeFileSync(resolve(dir, "out/z/index.html"), "Directory route");

    const result = spawnSync(process.execPath, [resolve(import.meta.dirname, "next-export.ts")], {
      cwd: dir,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("z/index.html already exists");
    expect(readFileSync(resolve(dir, "out/a.html"), "utf8")).toBe("Earlier route");
    expect(readFileSync(resolve(dir, "out/z.html"), "utf8")).toBe("Flat route");
    expect(readFileSync(resolve(dir, "out/z/index.html"), "utf8")).toBe("Directory route");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
