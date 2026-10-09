/** Offline, bounded brand packaging. Inputs pin every copied byte; no downloads. */
import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import ts from "typescript";

export interface BrandFile {
  source: string;
  path: string;
  bytes: number;
  sha256: string;
}
export interface BrandPackageInput {
  schemaVersion: 1;
  name: string;
  usage: string;
  files: BrandFile[];
  references: { path: string; bytes: number; sha256: string; note: string }[];
  markSource?: string;
}
const MAX_BYTES = 16 * 1024 * 1024;
const hash = (data: Buffer) => createHash("sha256").update(data).digest("hex");
function safePath(path: string) {
  if (
    typeof path !== "string" ||
    !/^[A-Za-z0-9_@./-]+$/.test(path) ||
    path.startsWith("/") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error(`Invalid relative path: ${JSON.stringify(path)}`);
}
function metadata(file: { bytes: number; sha256: string }) {
  if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256))
    throw new Error("Invalid file metadata");
}
async function verifiedFile(root: string, file: BrandFile) {
  safePath(file.source);
  metadata(file);
  if (file.bytes > MAX_BYTES) throw new Error(`Oversized source: ${file.source}`);
  let current = root;
  for (const part of file.source.split("/")) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink source: ${file.source}`);
  }
  const stat = await lstat(current);
  if (!stat.isFile() || stat.size !== file.bytes)
    throw new Error(`Source size mismatch: ${file.source}`);
  const data = await readFile(current);
  if (data.length !== file.bytes || hash(data) !== file.sha256)
    throw new Error(`Source hash mismatch: ${file.source}`);
  return data;
}

/** Only literal SVG geometry is supported. Fail rather than evaluate changed JSX. */
export function exportMarkSvg(source: string): string {
  const tree = ts.createSourceFile(
    "logo.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const svgs: (ts.JsxElement | ts.JsxSelfClosingElement)[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === "svg") ||
      (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === "svg")
    )
      svgs.push(node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  if (svgs.length !== 1) throw new Error("Expected exactly one literal SVG mark");
  const names: Record<string, string> = {
    viewBox: "viewBox",
    fill: "fill",
    d: "d",
    stroke: "stroke",
    strokeWidth: "stroke-width",
    strokeLinecap: "stroke-linecap",
    strokeLinejoin: "stroke-linejoin",
    cx: "cx",
    cy: "cy",
    r: "r",
  };
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  function render(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const tag = opening.tagName.getText(tree);
    if (!["svg", "path", "circle"].includes(tag)) throw new Error(`Unexpected SVG tag: ${tag}`);
    const attributes: string[] = [];
    for (const attribute of opening.attributes.properties) {
      if (
        !ts.isJsxAttribute(attribute) ||
        !attribute.initializer ||
        !ts.isStringLiteral(attribute.initializer)
      )
        throw new Error("Dynamic SVG attributes are not supported");
      const name = attribute.name.getText(tree);
      if (name === "className" && tag === "svg") continue; // Site display size; geometry remains in viewBox units.
      if (!names[name]) throw new Error(`Unexpected SVG attribute: ${name}`);
      if (/url\s*\(/i.test(attribute.initializer.text))
        throw new Error("External SVG paint is not supported");
      attributes.push(`${names[name]}="${escape(attribute.initializer.text)}"`);
    }
    if (tag === "svg") attributes.unshift('xmlns="http://www.w3.org/2000/svg"');
    let children = "";
    if (ts.isJsxElement(node)) {
      for (const child of node.children) {
        if (ts.isJsxText(child) && !child.text.trim()) continue;
        if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child))
          throw new Error("Dynamic SVG children are not supported");
        children += render(child);
      }
    }
    return `<${tag} ${attributes.join(" ")}>${children}</${tag}>`;
  }
  return `${render(svgs[0])}\n`;
}

function tar(entries: Map<string, Buffer>) {
  const chunks: Buffer[] = [];
  for (const [path, data] of [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const name = `quesar-brand/${path}`;
    if (Buffer.byteLength(name) > 100) throw new Error(`Archive path is too long: ${path}`);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "ascii");
    const octal = (value: number, offset: number, width: number) => {
      const digits = value.toString(8).padStart(width - 1, "0");
      if (digits.length >= width) throw new Error("Tar field overflow");
      header.write(`${digits}\0`, offset, width, "ascii");
    };
    octal(0o644, 100, 8);
    octal(0, 108, 8); // uid/gid and mtime deliberately stable.
    octal(0, 116, 8);
    octal(data.length, 124, 12);
    octal(0, 136, 12);
    header.fill(32, 148, 156);
    header.write("0", 156);
    header.write("ustar\0", 257);
    header.write("00", 263);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
    chunks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks), { level: 9 });
}

export async function buildBrandArchive(root: string, input: BrandPackageInput) {
  if (Buffer.byteLength(JSON.stringify(input)) > 256 * 1024)
    throw new Error("Package metadata exceeds 256 KiB bound");
  if (
    input.schemaVersion !== 1 ||
    typeof input.name !== "string" ||
    typeof input.usage !== "string" ||
    !Array.isArray(input.files) ||
    input.files.length > 128 ||
    !Array.isArray(input.references) ||
    input.references.length > 128
  )
    throw new Error("Invalid package metadata");
  const entries = new Map<string, Buffer>();
  const used = new Set(["distribution.json", "sha256sums"]);
  const sources = new Map<string, Buffer>();
  let total = 0;
  const add = (path: string, data: Buffer) => {
    safePath(path);
    if (used.has(path.toLowerCase())) throw new Error(`Duplicate archive path: ${path}`);
    if (
      [...used].some(
        (prior) =>
          path.toLowerCase().startsWith(`${prior}/`) || prior.startsWith(`${path.toLowerCase()}/`),
      )
    )
      throw new Error(`Archive file/directory path conflict: ${path}`);
    used.add(path.toLowerCase());
    total += data.length;
    if (total > MAX_BYTES) throw new Error("Brand package exceeds 16 MiB bound");
    entries.set(path, data);
  };
  const files = [];
  for (const file of [...input.files].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  )) {
    safePath(file.path);
    const data = await verifiedFile(resolve(root), file);
    add(file.path, data);
    sources.set(file.source, data);
    files.push({ path: file.path, source: file.source, bytes: data.length, sha256: hash(data) });
  }
  if (input.markSource) {
    const source = sources.get(input.markSource);
    if (!source) throw new Error("Mark source must be a verified packaged input");
    const data = Buffer.from(exportMarkSvg(source.toString("utf8")));
    const path = "identity/site-mark.svg";
    add(path, data);
    files.push({ path, source: input.markSource, bytes: data.length, sha256: hash(data) });
  }
  const references = input.references
    .map((reference) => {
      safePath(reference.path);
      metadata(reference);
      if (typeof reference.note !== "string") throw new Error("Invalid reference metadata");
      return {
        path: reference.path,
        bytes: reference.bytes,
        sha256: reference.sha256,
        note: reference.note,
      };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const manifest = {
    schemaVersion: 1,
    name: input.name,
    usage: input.usage,
    archive: { format: "ustar+gzip", uid: 0, gid: 0, mtime: 0, fileMode: "0644" },
    markExport: input.markSource
      ? "Exact literal SVG geometry; currentColor; CSS badge and live wordmark remain in source."
      : null,
    files: files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
    references,
  };
  entries.set("distribution.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  const sums = [...entries]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, data]) => `${hash(data)}  ${path}\n`)
    .join("");
  entries.set("SHA256SUMS", Buffer.from(sums));
  if ([...entries.values()].reduce((size, data) => size + data.length, 0) > MAX_BYTES)
    throw new Error("Brand package exceeds 16 MiB bound");
  const archive = tar(entries);
  return { archive, manifest, sha256: hash(archive) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [inputPath, outputPath, ...extra] = process.argv.slice(2);
  if (!inputPath || !outputPath || extra.length)
    throw new Error("Usage: node scripts/package-brand.ts <inputs.json> <new-output.tar.gz>");
  const input = JSON.parse(await readFile(inputPath, "utf8")) as BrandPackageInput;
  const result = await buildBrandArchive(fileURLToPath(new URL("../", import.meta.url)), input);
  await writeFile(outputPath, result.archive, { flag: "wx" });
  console.log(
    JSON.stringify(
      {
        output: outputPath,
        bytes: result.archive.length,
        sha256: result.sha256,
        files: result.manifest.files.length,
        references: result.manifest.references.length,
      },
      null,
      2,
    ),
  );
}
