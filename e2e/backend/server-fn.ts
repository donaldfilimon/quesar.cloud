// Calls server functions over their real browser transport: a same-origin POST from
// the page to the dispatcher (app/api/server-fn/[id]/route.server.ts), with the
// page's cookies and Fetch-Metadata, as the compiled client stub sends it
// (src/framework/server-fn.client.ts). Ids come from the build's own transform, so
// they cannot drift from what the app registers.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import {
  moduleIdFor,
  parseModule,
  transformServerFns,
  walk,
  type Node,
} from "../../scripts/next-transform.ts";
import { decode, encode, SERVER_FN_PATH, type WireReply } from "../../src/framework/wire.ts";

/** The `.handler("<id>")` argument inside a compiled declaration, if there is one. */
function handlerId(init: Node): string | undefined {
  let id: string | undefined;
  walk(init, (node) => {
    if (id || node.type !== "CallExpression") return;
    const callee = node.callee as Node;
    const [argument] = node.arguments as Node[];
    if (
      callee.type === "MemberExpression" &&
      (callee.property as Node).name === "handler" &&
      argument?.type === "StringLiteral"
    )
      id = argument.value as string;
  });
  return id;
}

const cache = new Map<string, Map<string, string>>();

/** `const name = createServerFn(…).handler(…)` → its id, for a module under `src/`. */
function idsFor(module: string): Map<string, string> {
  const known = cache.get(module);
  if (known) return known;
  const root = process.cwd();
  const file = [".ts", ".tsx"]
    .map((extension) => resolve(root, "src", `${module}${extension}`))
    .find(existsSync);
  if (!file) throw new Error(`No source module src/${module}.ts(x)`);
  const compiled = transformServerFns(
    readFileSync(file, "utf8"),
    moduleIdFor(root, file),
    "client",
  );
  if (!compiled) throw new Error(`src/${module} defines no server functions`);
  const ids = new Map<string, string>();
  walk(parseModule(compiled), (node) => {
    if (node.type !== "VariableDeclarator" || (node.id as Node).type !== "Identifier") return;
    const id = node.init ? handlerId(node.init as Node) : undefined;
    if (id) ids.set((node.id as Node).name as string, id);
  });
  cache.set(module, ids);
  return ids;
}

export function serverFnId(module: string, name: string): string {
  const id = idsFor(module).get(name);
  if (!id) throw new Error(`src/${module} has no server function named ${name}`);
  return id;
}

/** The dispatcher URL path for a server function, as the browser requests it. */
export function serverFnPath(module: string, name: string): string {
  return `${SERVER_FN_PATH}${encodeURIComponent(serverFnId(module, name))}`;
}

/**
 * The function's result, or `{ thrown: message }` when it throws (the message the
 * client stub rethrows; `UnauthorizedError` arrives as "Unauthorized").
 */
export async function callServerFn(
  page: Page,
  module: string,
  name: string,
  data?: unknown,
): Promise<unknown> {
  const path = serverFnPath(module, name);
  const { status, text } = await page.evaluate(
    async ({ path, body }) => {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body,
        credentials: "same-origin",
      });
      return { status: response.status, text: await response.text() };
    },
    { path, body: encode({ data }) },
  );
  let reply: WireReply;
  try {
    reply = decode<WireReply>(text);
  } catch {
    return { thrown: `Server function ${serverFnId(module, name)} failed (${status}).` };
  }
  return reply.ok ? reply.result : { thrown: reply.error.message };
}
