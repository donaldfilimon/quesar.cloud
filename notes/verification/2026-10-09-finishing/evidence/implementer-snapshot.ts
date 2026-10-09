import type { TreeEntry, InstalledManifest } from "./evidence-types.ts";
// Local qualification receipt only. No credentials, dependency edits or remote access.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, lstat, readFile, readdir, readlink, realpath, writeFile } from "node:fs/promises";
import { resolve, join, relative, sep, isAbsolute } from "node:path";

const evidence = resolve("notes/verification/2026-10-09-finishing/evidence");
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function tree(root: string) {
  const hash = createHash("sha256"),
    files: Record<string, TreeEntry> = {};
  async function walk(path: string) {
    for (const entry of (await readdir(join(root, path), { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const name = join(path, entry.name);
      if (entry.isSymbolicLink()) {
        const destination = relative(root, await realpath(join(root, name)));
        if (destination === ".." || destination.startsWith(`..${sep}`) || isAbsolute(destination))
          throw new Error(`Artifact link leaves root: ${name} -> ${destination}`);
        const link = await readlink(join(root, name));
        hash.update(JSON.stringify(["link", name, link]));
        files[name] = { link };
      } else if (entry.isDirectory()) {
        hash.update(JSON.stringify(["directory", name]));
        await walk(name);
      } else if (entry.isFile()) {
        const bytes = await readFile(join(root, name));
        hash.update(JSON.stringify(["file", name, bytes.length]));
        hash.update(bytes);
        files[name] = { sha256: digest(bytes), bytes: bytes.length };
      } else throw new Error("Unsupported artifact entry");
    }
  }
  await walk("");
  return { sha256: hash.digest("hex"), files };
}
const phase = process.argv[2];
if (!["freeze", "final"].includes(phase)) throw new Error("Use freeze or final");
const generation = process.argv[3] ?? "";
if (!["", "current", "trailer", "closure"].includes(generation))
  throw new Error("Unknown receipt generation");
const prefix = generation ? `implementer-${generation}` : "implementer";
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");
const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
  encoding: "utf8",
}).split("\0");
const paths = [...new Set([...tracked, ...untracked])]
  .filter(
    (path) =>
      /^(src|scripts|e2e|migrations|sidecars\/quasar-service)\//.test(path) ||
      /^(package\.json|bun\.lock|package-lock\.json|[^/]*config\.[^/]+|AGENTS\.md|CLAUDE\.md)$/.test(
        path,
      ),
  )
  .sort();
const source: Record<string, string> = {};
for (const path of paths) source[path] = digest(await readFile(path));
const installed: Record<string, InstalledManifest> = {};
for (const name of [
  "better-auth",
  "@better-auth/core",
  "@better-auth/passkey",
  "@playwright/test",
  "playwright",
  "vite",
  "vitest",
  "shadcn",
  "typescript",
  "nitro",
  "react",
  "react-dom",
  "pg",
]) {
  const path = join("node_modules", name, "package.json");
  const bytes = await readFile(path);
  installed[name] = {
    version: (JSON.parse(bytes.toString("utf8")) as { version: string }).version,
    manifest_sha256: digest(bytes),
    realpath: await realpath(path),
  };
}
const output = resolve(".output");
const frozen = resolve(
  `.superpowers/sdd/2026-10-09-finish-approved-delivery/${generation === "closure" ? "implementer-trailer" : prefix}-persistent-artifact`,
);
if (generation === "closure" && phase !== "final")
  throw new Error("Closure inspection is read-only");
if (phase === "freeze") {
  try {
    await lstat(frozen);
    throw new Error("Frozen target already exists; never overwrite");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const before = await tree(output);
  await cp(output, frozen, {
    recursive: true,
    preserveTimestamps: true,
    verbatimSymlinks: true,
    errorOnExist: true,
    force: false,
  });
  const copied = await tree(frozen),
    after = await tree(output);
  if (before.sha256 !== copied.sha256 || before.sha256 !== after.sha256)
    throw new Error("Artifact changed during copy");
}
const result = {
  observed_at_utc: new Date().toISOString(),
  baseline: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
  toolchain: {
    node: process.version,
    bun: execFileSync("bun", ["--version"], { encoding: "utf8" }).trim(),
  },
  source_sha256: digest(JSON.stringify(source)),
  source,
  installed,
  docs: await tree(resolve("docs")),
  public: await tree(resolve("public")),
  persistent: { root: frozen, ...(await tree(frozen)) },
  native_binary_sha256: digest(
    await readFile("/Users/donaldfilimon/dev/active/wdbx/zig-out/bin/wdbx"),
  ),
};
await writeFile(
  join(evidence, `${prefix}-${phase}-hashes.json`),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    phase,
    source_sha256: result.source_sha256,
    docs_sha256: result.docs.sha256,
    persistent_sha256: result.persistent.sha256,
    native_binary_sha256: result.native_binary_sha256,
  }),
);
