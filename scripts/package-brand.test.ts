import { mkdtemp, mkdir, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { buildBrandArchive, exportMarkSvg, type BrandPackageInput } from "./package-brand.ts";

const roots: string[] = [];
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "quesar-brand-test-"));
  roots.push(root);
  await mkdir(join(root, "src"));
  await writeFile(join(root, "src/brand.txt"), "Quesar\n");
  const input: BrandPackageInput = {
    schemaVersion: 1,
    name: "Quesar local brand distribution",
    usage: "Local authorized review; no public reuse license inferred.",
    files: [
      { source: "src/brand.txt", path: "sources/brand.txt", bytes: 7, sha256: hash("Quesar\n") },
    ],
    references: [],
  };
  return { root, input };
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("brand distribution", () => {
  it("is deterministic across input order and source metadata; records actual hashes", async () => {
    const { root, input } = await fixture();
    await writeFile(join(root, "src/second.txt"), "second");
    input.files.push({
      source: "src/second.txt",
      path: "sources/second.txt",
      bytes: 6,
      sha256: hash("second"),
    });
    const first = await buildBrandArchive(root, input);
    await utimes(join(root, "src/brand.txt"), new Date(0), new Date(0));
    const second = await buildBrandArchive(root, { ...input, files: [...input.files].reverse() });
    expect(second.archive.equals(first.archive)).toBe(true);
    expect(first.manifest.files.find((file) => file.path === "sources/brand.txt")?.sha256).toBe(
      hash("Quesar\n"),
    );
    const tar = gunzipSync(first.archive);
    expect(tar.toString()).toContain("quesar-brand/SHA256SUMS");
    expect(tar.toString()).toContain("Quesar\n");
    expect(tar.subarray(-1024).equals(Buffer.alloc(1024))).toBe(true);
  });
  it.each([
    "../secret",
    "/absolute",
    "C:/drive",
    "src/../brand.txt",
    "src\\brand.txt",
    "src//brand.txt",
    "src/./brand.txt",
    "src/\0bad",
  ])("rejects source traversal or ambiguous path %s", async (source) => {
    const { root, input } = await fixture();
    input.files[0].source = source;
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/path/i);
  });
  it("rejects archive traversal and case-insensitive collisions", async () => {
    const { root, input } = await fixture();
    input.files[0].path = "../escape";
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/path/i);
    input.files[0].path = "sources/Brand.txt";
    input.files.push({ ...input.files[0], path: "sources/brand.txt" });
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/duplicate/i);
  });
  it("rejects missing, changed and truncated sources before generating an archive", async () => {
    const { root, input } = await fixture();
    await writeFile(join(root, "src/brand.txt"), "Changed");
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/hash/i);
    await writeFile(join(root, "src/brand.txt"), "short");
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/size/i);
    await rm(join(root, "src/brand.txt"));
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/ENOENT/);
  });
  it("rejects symlink files and parent directories", async () => {
    const { root, input } = await fixture();
    await symlink(join(root, "src/brand.txt"), join(root, "linked.txt"));
    input.files[0].source = "linked.txt";
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/symlink/i);
    await symlink(join(root, "src"), join(root, "linked"));
    input.files[0].source = "linked/brand.txt";
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/symlink/i);
  });
  it("rejects malformed metadata and reserved output names", async () => {
    const { root, input } = await fixture();
    input.files[0].bytes = -1;
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/metadata/i);
    input.files[0].bytes = 7;
    input.files[0].path = "distribution.json";
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/duplicate/i);
  });
  it("rejects file/directory path conflicts and oversized reference metadata", async () => {
    const { root, input } = await fixture();
    input.files.push({ ...input.files[0], path: "sources/brand.txt/nested" });
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/conflict/i);
    input.files.pop();
    input.references.push({
      path: "public/video.mp4",
      bytes: 7,
      sha256: hash("Quesar\n"),
      note: "x".repeat(262144),
    });
    await expect(buildBrandArchive(root, input)).rejects.toThrow(/metadata/i);
  });
});

describe("exact mark export", () => {
  it("exports the current component's literal geometry without tracing", async () => {
    const source = await readFile(
      new URL("../src/components/site/logo.tsx", import.meta.url),
      "utf8",
    );
    const svg = exportMarkSvg(source);
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toContain('d="M8 23 L8 10 L16 16 L24 10 L24 23"');
    expect(svg.match(/<circle /g)).toHaveLength(5);
    expect(svg).toContain('stroke-width="2"');
    expect(svg).not.toContain("className");
  });
  it.each([
    "const mark = <svg><path d={value}/></svg>;",
    "const mark = <svg><script>bad</script></svg>;",
    'const mark = <svg onLoad="bad"/>;',
    'const mark = <svg><image href="remote"/></svg>;',
    "const mark = <><svg/><svg/></>;",
  ])("fails closed on dynamic or unexpected SVG source", (source) => {
    expect(() => exportMarkSvg(source)).toThrow();
  });
});
