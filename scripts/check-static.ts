import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import { transform } from "lightningcss";

type Node = DefaultTreeAdapterMap["node"];
const root = resolve("docs");
const origin = "https://quesar.cloud";
// Preload ceilings sit about four above the measured counts after the content
// barrel was split (2026-09-29: 17, 17, 19, 21); gzip ceilings are unchanged.
const budgets = [
  { route: "/", preloads: 21, gzip: 225362 },
  { route: "/docs/", preloads: 21, gzip: 264643 },
  { route: "/research/", preloads: 23, gzip: 247971 },
  { route: "/developers/", preloads: 25, gzip: 235878 },
];
function walk(node: Node, visit: (node: DefaultTreeAdapterMap["element"]) => void) {
  if ("tagName" in node) visit(node);
  if ("childNodes" in node) for (const child of node.childNodes) walk(child, visit);
}
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
function localFile(url: URL): string | null {
  const file = resolve(root, "." + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + sep)) return null;
  if (!existsSync(file)) return null;
  return statSync(file).isDirectory() ? resolve(file, "index.html") : file;
}
const pages = new Map<
  string,
  { ids: Set<string>; links: string[]; scripts: Set<string>; preloads: number }
>();
for (const file of files(root).filter((file) => file.endsWith(".html"))) {
  const data = {
    ids: new Set<string>(),
    links: [] as string[],
    scripts: new Set<string>(),
    preloads: 0,
  };
  walk(parse(readFileSync(file, "utf8")), (node) => {
    const attrs = Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
    if (attrs.id) data.ids.add(attrs.id);
    if (node.tagName === "a" && attrs.name) data.ids.add(attrs.name);
    for (const attr of ["src", "poster"]) if (attrs[attr]) data.links.push(attrs[attr]);
    if (attrs.href && ["a", "link"].includes(node.tagName)) data.links.push(attrs.href);
    if (attrs.srcset)
      data.links.push(...attrs.srcset.split(",").map((s) => s.trim().split(/\s+/)[0]));
    if (node.tagName === "script" && attrs.src) data.scripts.add(attrs.src);
    if (node.tagName === "link" && attrs.rel === "modulepreload") {
      data.preloads++;
      data.scripts.add(attrs.href);
    }
  });
  pages.set(file, data);
}
const failures = new Set<string>();
const checkedMedia = new Set<string>();
let external = 0;
const references = [...pages].map(([file, page]) => ({
  path:
    "/" +
    relative(root, file)
      .split(sep)
      .join("/")
      .replace(/index\.html$/, ""),
  links: page.links,
}));
for (const file of files(root).filter((file) => /search-catalog-[^/]+\.json$/.test(file))) {
  const entries = JSON.parse(readFileSync(file, "utf8")) as { href: string; hash?: string }[];
  references.push({
    path: "/" + relative(root, file).split(sep).join("/"),
    links: entries.map((entry) => entry.href + (entry.hash ? "#" + entry.hash : "")),
  });
}
for (const { path, links } of references) {
  for (const raw of links) {
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) continue;
    const url = new URL(raw, origin + path);
    if (url.origin !== origin) {
      external++;
      continue;
    }
    const target = localFile(url);
    if (!target || !existsSync(target)) {
      failures.add(`${path}: missing ${url.pathname}`);
      continue;
    }
    if (url.pathname.startsWith("/media/") && !checkedMedia.has(target)) {
      checkedMedia.add(target);
      const source = resolve("public", "." + decodeURIComponent(url.pathname));
      if (
        existsSync(source) &&
        statSync(source).isFile() &&
        (statSync(source).size !== statSync(target).size ||
          !readFileSync(source).equals(readFileSync(target)))
      )
        failures.add(`built media differs from public source: ${url.pathname}`);
    }
    const hash = decodeURIComponent(url.hash.slice(1));
    if (hash && pages.has(target) && !pages.get(target)!.ids.has(hash)) {
      failures.add(`${path}: missing anchor ${url.pathname}#${hash}`);
    }
  }
}
for (const file of files(root).filter((file) => file.endsWith(".css"))) {
  const path = "/" + relative(root, file).split(sep).join("/");
  const { dependencies } = transform({
    filename: file,
    code: readFileSync(file),
    analyzeDependencies: true,
  });
  for (const dependency of dependencies ?? []) {
    if (dependency.type !== "url" && dependency.type !== "import") continue;
    const url = new URL(dependency.url, origin + path);
    if (url.origin !== origin) continue;
    const target = localFile(url);
    if (!target || !existsSync(target)) failures.add(`${path}: missing CSS asset ${url.pathname}`);
  }
}
for (const budget of budgets) {
  const file = localFile(new URL(budget.route, origin))!;
  const page = pages.get(file)!;
  const gzip = [...page.scripts].reduce((sum, src) => {
    const asset = localFile(new URL(src, origin));
    return asset && asset.endsWith(".js") ? sum + gzipSync(readFileSync(asset)).length : sum;
  }, 0);
  console.log(
    `${budget.route}: ${page.preloads}/${budget.preloads} preloads; ${gzip}/${budget.gzip} gzip bytes`,
  );
  if (page.preloads > budget.preloads || gzip > budget.gzip)
    failures.add(`${budget.route}: initial JavaScript budget exceeded`);
}
console.log(
  `Checked ${pages.size} HTML pages; ${external} external references excluded from network checks.`,
);
for (const failure of failures) console.error(failure);
if (failures.size) process.exitCode = 1;
