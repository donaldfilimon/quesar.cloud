import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectSourceManifest, assertMatchingSourceDigest } from "./upgrade-provenance.mjs";

async function fixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "quesar-provenance-"));
  try {
    await mkdir(path.join(root, "src", "engine"), { recursive: true });
    await writeFile(
      path.join(root, "index.html"),
      '<div id="root"></div><script type="module" src="/main.jsx"></script>',
    );
    await writeFile(
      path.join(root, "main.jsx"),
      'import { render } from "@/engine"; import "./style.css"; render();',
    );
    await writeFile(path.join(root, "src/engine/index.ts"), 'export { render } from "./render";');
    await writeFile(
      path.join(root, "src/engine/render.ts"),
      'export const render = () => "first";',
    );
    await writeFile(path.join(root, "style.css"), 'body { background: url("./texture.svg"); }');
    await writeFile(path.join(root, "texture.svg"), "<svg/>");
    const options = { root, browserRoot: root, entries: [path.join(root, "index.html")] };
    await fn(root, () => collectSourceManifest(options));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("bootstrap-only change invalidates initial digest and refuses both reuse and post-render acceptance", async () => {
  await fixture(async (root, manifest) => {
    const before = await manifest();
    assertMatchingSourceDigest(before.digest, (await manifest()).digest);
    await writeFile(
      path.join(root, "index.html"),
      '<style>body{opacity:.4}</style><div id="root"></div><script type="module" src="/main.jsx"></script>',
    );
    const after = await manifest();
    assert.notEqual(before.digest, after.digest);
    assert.deepEqual(
      Object.keys(before.sources).filter((p) => before.sources[p] !== after.sources[p]),
      ["index.html"],
    );
    assert.throws(() => assertMatchingSourceDigest(before.digest, after.digest), /refusing reuse/);
  });
});
test("follows the barrel and its transitive modules without a handwritten file list", async () => {
  await fixture(async (root, manifest) => {
    const before = await manifest();
    assert.ok(before.sources["src/engine/index.ts"]);
    assert.ok(before.sources["src/engine/render.ts"]);
    await writeFile(
      path.join(root, "src/engine/render.ts"),
      'export const render = () => "second";',
    );
    const after = await manifest();
    assert.notEqual(before.digest, after.digest);
    assert.throws(() => assertMatchingSourceDigest(before.digest, after.digest), /refusing/);
  });
});
test("includes stylesheet assets and discovers newly introduced bootstrap modules", async () => {
  await fixture(async (root, manifest) => {
    const before = await manifest();
    assert.ok(before.sources["texture.svg"]);
    await writeFile(path.join(root, "new.js"), "export const value = 1;");
    await writeFile(
      path.join(root, "index.html"),
      '<script type="module">import "./new.js";</script>',
    );
    const after = await manifest();
    assert.ok(after.sources["new.js"]);
    assert.notEqual(before.digest, after.digest);
  });
});
test("fails closed on missing local module", async () => {
  await fixture(async (root, manifest) => {
    await writeFile(path.join(root, "main.jsx"), 'import "./absent.js";');
    await assert.rejects(manifest, /Unresolved provenance input/);
  });
});
