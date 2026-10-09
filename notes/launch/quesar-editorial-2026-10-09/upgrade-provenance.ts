import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
import type { DefaultTreeAdapterMap } from "parse5";
import { parse } from "parse5";

const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const exists = async (file: string) => {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
};

/** Follow repository ESM imports/re-exports (including type imports), HTML
 * bootstrap references and CSS/font assets. Package JS implementations are
 * identified by package.json/bun.lock; CDN model identity remains in its loader
 * and voice receipt. Nonliteral dynamic local entrypoints must be explicit seeds.
 */
export async function collectSourceManifest({
  root,
  browserRoot,
  entries,
}: {
  root: string;
  browserRoot: string;
  entries: string[];
}) {
  const visited = new Set<string>(),
    external = new Set<string>(),
    sources: Record<string, string> = {};
  async function resolveLocal(specifier: string, importer: string, css = false) {
    const spec = specifier.split(/[?#]/, 1)[0];
    if (!spec || /^(?:https?:|data:|node:|blob:)/.test(spec)) {
      external.add(specifier);
      return null;
    }
    let candidate;
    if (spec.startsWith("@/")) candidate = path.join(root, "src", spec.slice(2));
    else if (spec.startsWith("/@fs/")) candidate = spec.slice(4);
    else if (spec.startsWith("/")) candidate = path.join(browserRoot, spec.slice(1));
    else if (spec.startsWith(".")) candidate = path.resolve(path.dirname(importer), spec);
    else if (css) candidate = createRequire(importer).resolve(spec);
    else {
      external.add(spec);
      return null;
    }
    for (const file of [
      candidate,
      ...[".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.tsx", "/index.ts"].map(
        (ext) => candidate + ext,
      ),
    ]) {
      if (await exists(file)) return file;
    }
    throw Error(`Unresolved provenance input ${specifier} from ${path.relative(root, importer)}`);
  }
  async function visit(file: string) {
    file = path.resolve(file);
    if (visited.has(file)) return;
    if (file !== root && !file.startsWith(root + path.sep))
      throw Error("Provenance input outside repository");
    visited.add(file);
    const bytes = await readFile(file),
      extension = path.extname(file);
    sources[path.relative(root, file)] = hash(bytes);
    const refs: [string, boolean][] = [];
    if (/\.[cm]?[jt]sx?$/.test(extension)) {
      // TypeScript's scanner handles multiline imports, side-effect imports,
      // export-from barrels and literal dynamic imports without executing code.
      for (const item of ts.preProcessFile(bytes.toString("utf8"), true, true).importedFiles)
        refs.push([item.fileName, false]);
    } else if (extension === ".html") {
      const walk = (node: DefaultTreeAdapterMap["node"]) => {
        const attrs = Object.fromEntries(
          ("attrs" in node ? node.attrs : []).map((a) => [a.name, a.value]),
        );
        if (attrs.src) refs.push([attrs.src, false]);
        if (
          node.nodeName === "link" &&
          /(?:stylesheet|modulepreload|preload)/.test(attrs.rel ?? "") &&
          attrs.href
        )
          refs.push([attrs.href, false]);
        if (node.nodeName === "script" && !attrs.src) {
          const code = ("childNodes" in node ? node.childNodes : [])
            .map((n) => ("value" in n ? n.value : ""))
            .join("");
          for (const item of ts.preProcessFile(code, true, true).importedFiles)
            refs.push([item.fileName, false]);
        }
        for (const child of "childNodes" in node ? node.childNodes : []) walk(child);
      };
      walk(parse(bytes.toString("utf8")));
    } else if (extension === ".css") {
      const css = bytes.toString("utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const match of css.matchAll(/@import\s+["']([^"']+)["']/g)) refs.push([match[1], true]);
      for (const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g))
        refs.push([match[1], true]);
    }
    for (const [specifier, css] of refs) {
      const dependency = await resolveLocal(specifier, file, css);
      if (dependency) await visit(dependency);
    }
  }
  for (const entry of entries) await visit(entry);
  const ordered = Object.fromEntries(
    Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)),
  );
  const externalImports = [...external].sort();
  return {
    sources: ordered,
    externalImports,
    digest: hash(JSON.stringify({ sources: ordered, externalImports })),
  };
}

export function assertMatchingSourceDigest(recorded: string, current: string) {
  if (recorded !== current) throw Error("Source inputs changed; refusing reuse or verified status");
}
