import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moduleIdFor, transformGlobs, transformServerFns } from "./next-transform.ts";

const source = `import { createServerFn } from "@/framework/server-fn";
import { authMiddleware } from "@/lib/auth/middleware";
export const one = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => (await import("./x.server")).run(context.userId));
export const two = createServerFn({ method: "POST" })
  .validator((input: unknown) => input as { id: string })
  .handler(async ({ data }) => {
    const { del } = await import("@/lib/db");
    return del(data.id);
  });
const notAServerFn = { handler: (fn: () => void) => fn };
notAServerFn.handler(() => {});
`;

describe("transformServerFns", () => {
  it("replaces handlers with their ids in browser bundles, dropping server code", () => {
    const out = transformServerFns(source, "lib/console", "client")!;
    expect(out).toContain('.handler("lib/console#0")');
    expect(out).toContain('.handler("lib/console#1")');
    expect(out).not.toContain("x.server");
    expect(out).not.toContain("@/lib/db");
    expect(out).toContain("notAServerFn.handler(() => {})");
  });

  it("keeps handlers on the server and passes the id alongside", () => {
    const out = transformServerFns(source, "lib/console", "server")!;
    expect(out).toContain('run(context.userId), "lib/console#0")');
    expect(out).toContain('return del(data.id);\n  }, "lib/console#1")');
    expect(out).toContain("notAServerFn.handler(() => {})");
  });

  it("leaves modules without server functions alone", () => {
    expect(transformServerFns("export const a = 1;", "lib/a", "client")).toBeNull();
  });

  it("derives module ids from the path under src/", () => {
    expect(moduleIdFor("/repo", "/repo/src/lib/auth/methods.ts")).toBe("lib/auth/methods");
  });
});

describe("transformGlobs", () => {
  const root = mkdtempSync(join(tmpdir(), "quesar-glob-"));
  mkdirSync(join(root, "migrations"));
  writeFileSync(join(root, "migrations", "0002_b.sql"), "b");
  writeFileSync(join(root, "migrations", "0001_a.sql"), "a");

  it("expands eager raw globs into sorted source imports", () => {
    const out = transformGlobs(
      'const m = import.meta.glob("/migrations/*.sql", { query: "?raw", import: "default", eager: true });',
      root,
    )!;
    expect(out).toContain(
      `import __quesarGlob0_0 from ${JSON.stringify(join(root, "migrations/0001_a.sql?raw"))};`,
    );
    expect(out).toContain(
      '"/migrations/0001_a.sql": __quesarGlob0_0, "/migrations/0002_b.sql": __quesarGlob0_1',
    );
  });

  it("keeps lazy glob keys without importing the modules", () => {
    const out = transformGlobs('Object.keys(import.meta.glob("/migrations/*.sql"))', root)!;
    expect(out).toContain('"/migrations/0001_a.sql": () => Promise.reject(');
    expect(out).not.toContain("import ");
  });
});
