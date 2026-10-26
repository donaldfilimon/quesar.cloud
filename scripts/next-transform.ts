/**
 * Build-time transforms for the Next.js build (scripts/next-transform-loader.ts),
 * doing what the TanStack Start compiler and Vite do for the Vite build
 * (notes/superpowers/specs/2026-10-26-nextjs-app-router-port.md, stage 2):
 *
 * - `createServerFn(…).handler(fn)`: in browser bundles the handler is replaced by
 *   the function's id, so its body and its server-only imports never ship; on the
 *   server the id is passed alongside it so the dispatcher can find it. Ids are
 *   `<module path relative to src/>#<n>`, n counting handlers in source order.
 * - `import.meta.glob(pattern, options)`: expanded at build time into an object
 *   literal, as Vite does. Eager `?raw` globs import the files as source text;
 *   lazy globs keep their keys, with loaders that refuse (no caller uses them,
 *   and importing route components into the server graph would not compile).
 */
import { globSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parse } from "@babel/parser";
import MagicString from "magic-string";

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

function isNode(value: unknown): value is Node {
  return Boolean(value && typeof value === "object" && typeof (value as Node).type === "string");
}

function walk(node: Node, visit: (node: Node) => void) {
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "extra" || key.endsWith("Comments")) continue;
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) walk(item, visit);
    } else if (isNode(value)) walk(value, visit);
  }
}

function parseModule(code: string): Node {
  return parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx", "importMeta"],
  }).program as unknown as Node;
}

/** `createServerFn(…)` at the root of a `.middleware().validator().handler()` chain. */
function rootsAtCreateServerFn(node: Node): boolean {
  let current: Node | undefined = node;
  while (current) {
    if (current.type === "CallExpression") {
      const callee = current.callee as Node;
      if (callee.type === "Identifier" && callee.name === "createServerFn") return true;
      current = callee;
    } else if (current.type === "MemberExpression") {
      current = current.object as Node;
    } else return false;
  }
  return false;
}

export function serverFnId(moduleId: string, index: number) {
  return `${moduleId}#${index}`;
}

/** The module id for a source file: its path under `src/`, without extension. */
export function moduleIdFor(root: string, resourcePath: string) {
  return relative(resolve(root, "src"), resourcePath)
    .replace(/\\/g, "/")
    .replace(/\.[cm]?[jt]sx?$/, "");
}

export function transformServerFns(
  code: string,
  moduleId: string,
  target: "client" | "server",
): string | null {
  if (!code.includes("createServerFn")) return null;
  const handlers: Node[] = [];
  walk(parseModule(code), (node) => {
    if (node.type !== "CallExpression") return;
    const callee = node.callee as Node;
    if (callee.type !== "MemberExpression") return;
    const property = callee.property as Node;
    if (property.type !== "Identifier" || property.name !== "handler") return;
    if (rootsAtCreateServerFn(callee.object as Node)) handlers.push(node);
  });
  if (!handlers.length) return null;
  handlers.sort((a, b) => a.start - b.start);
  const out = new MagicString(code);
  handlers.forEach((call, index) => {
    const args = call.arguments as Node[];
    const id = JSON.stringify(serverFnId(moduleId, index));
    if (!args.length) throw new Error(`${moduleId}: .handler() without a function`);
    if (target === "client") out.overwrite(args[0].start, args.at(-1)!.end, id);
    else out.appendLeft(args.at(-1)!.end, `, ${id}`);
  });
  return out.toString();
}

function literalValue(node: Node | undefined): unknown {
  if (!node) return undefined;
  if (node.type === "StringLiteral" || node.type === "BooleanLiteral") return node.value;
  if (node.type === "ObjectExpression") {
    const object: Record<string, unknown> = {};
    for (const prop of node.properties as Node[]) {
      const key = prop.key as Node;
      const name = key.type === "Identifier" ? key.name : key.value;
      object[String(name)] = literalValue(prop.value as Node);
    }
    return object;
  }
  throw new Error(`import.meta.glob options must be literals (found ${node.type})`);
}

export function transformGlobs(code: string, root: string): string | null {
  if (!code.includes("import.meta.glob")) return null;
  const calls: Node[] = [];
  walk(parseModule(code), (node) => {
    if (node.type !== "CallExpression") return;
    const callee = node.callee as Node;
    if (callee.type !== "MemberExpression") return;
    const object = callee.object as Node;
    const property = callee.property as Node;
    if (
      object.type === "MetaProperty" &&
      property.type === "Identifier" &&
      property.name === "glob"
    )
      calls.push(node);
  });
  if (!calls.length) return null;
  const out = new MagicString(code);
  const imports: string[] = [];
  calls.forEach((call, callIndex) => {
    const [patternNode, optionsNode] = call.arguments as Node[];
    const pattern = literalValue(patternNode);
    if (typeof pattern !== "string" || !pattern.startsWith("/"))
      throw new Error("import.meta.glob patterns must be root-relative string literals");
    const options = (literalValue(optionsNode) ?? {}) as {
      eager?: boolean;
      query?: string;
      import?: string;
    };
    const files = globSync(pattern.slice(1), { cwd: root }).sort();
    const entries = files.map((file, fileIndex) => {
      const key = JSON.stringify(`/${file.replace(/\\/g, "/")}`);
      const path = JSON.stringify(`${resolve(root, file)}${options.query ?? ""}`);
      if (!options.eager) {
        return `${key}: () => Promise.reject(new Error("import.meta.glob loaders are not available in the Next.js build"))`;
      }
      const local = `__quesarGlob${callIndex}_${fileIndex}`;
      imports.push(
        options.import === "default"
          ? `import ${local} from ${path};`
          : `import * as ${local} from ${path};`,
      );
      return `${key}: ${local}`;
    });
    out.overwrite(call.start, call.end, `({ ${entries.join(", ")} })`);
  });
  if (imports.length) out.prepend(`${imports.join("\n")}\n`);
  return out.toString();
}
