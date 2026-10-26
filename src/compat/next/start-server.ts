/**
 * `@tanstack/react-start` and `@tanstack/react-start/server` in the server bundle of
 * the Next.js server build. `.handler(fn, id)` (the id comes from the loader in
 * scripts/next-transform.ts) registers the function for the dispatcher and
 * returns a direct caller, so server-side callers (route loaders during SSR) run
 * it in-process. Middleware runs in order, then the input validator, then the
 * handler, with `next({ context })` merging context as TanStack Start does.
 */
import { AsyncLocalStorage } from "node:async_hooks";

type Context = Record<string, unknown>;
type Next = (options?: { context?: Context }) => Promise<Step>;
interface Step {
  context: Context;
  result?: unknown;
}
type MiddlewareFn = (options: {
  next: Next;
  context: Context;
  data: unknown;
  request: Request;
}) => Promise<Step> | Step;

interface Middleware {
  dependencies: Middleware[];
  server?: MiddlewareFn;
}

interface MiddlewareBuilder extends Middleware {
  middleware: (list: Middleware[]) => MiddlewareBuilder;
  server: MiddlewareFn & ((fn: MiddlewareFn) => MiddlewareBuilder);
  client: (fn: unknown) => MiddlewareBuilder;
}

export function createMiddleware(_options?: unknown): MiddlewareBuilder {
  const state: Middleware = { dependencies: [] };
  const builder = {
    get dependencies() {
      return state.dependencies;
    },
    middleware(list: Middleware[]) {
      state.dependencies = [...state.dependencies, ...list];
      return builder;
    },
    server(fn: MiddlewareFn) {
      state.server = fn;
      return builder;
    },
    client() {
      return builder;
    },
    get serverFn() {
      return state.server;
    },
  };
  return builder as unknown as MiddlewareBuilder;
}

/** Request middleware is a no-op here: CSRF is in the dispatcher, readiness and CSP in proxy.server.ts. */
export const createCsrfMiddleware = createMiddleware;

export function createStart(_options?: unknown) {
  return {};
}

function flatten(list: Middleware[], seen = new Set<Middleware>()): Middleware[] {
  return list.flatMap((item) => {
    if (seen.has(item)) return [];
    seen.add(item);
    return [...flatten(item.dependencies ?? [], seen), item];
  });
}

/* ---------------------------------------------------------------- request scope */

interface Scope {
  request: Request;
  headers: Headers;
}
const scope = new AsyncLocalStorage<Scope>();

export function runWithRequest<T>(request: Request, fn: () => Promise<T>) {
  const headers = new Headers();
  return scope.run({ request, headers }, async () => ({ value: await fn(), headers }));
}

export function getRequest(): Request {
  const current = scope.getStore();
  if (!current) throw new Error("getRequest() called outside a server function or API route.");
  return current.request;
}

export function setResponseHeader(name: string, value: string) {
  scope.getStore()?.headers.set(name, value);
}

/* ------------------------------------------------------------- server functions */

type Handler = (options: { data: unknown; context: Context; method: string }) => unknown;
interface Entry {
  method: string;
  middleware: Middleware[];
  validator?: (input: unknown) => unknown;
  handler: Handler;
}

const registry = new Map<string, Entry>();

export function lookupServerFn(id: string): Entry | undefined {
  return registry.get(id);
}

export async function executeServerFn(entry: Entry, data: unknown): Promise<unknown> {
  const chain = flatten(entry.middleware);
  const request = scope.getStore()?.request ?? new Request("http://localhost/");
  const run = async (index: number, context: Context): Promise<Step> => {
    if (index < chain.length) {
      const server = (chain[index] as unknown as { serverFn?: MiddlewareFn }).serverFn;
      if (!server) return run(index + 1, context);
      return server({
        context,
        data,
        request,
        next: (options) => run(index + 1, { ...context, ...options?.context }),
      });
    }
    const input = entry.validator ? await entry.validator(data) : data;
    return { context, result: await entry.handler({ data: input, context, method: entry.method }) };
  };
  return (await run(0, {})).result;
}

interface ServerFnBuilder {
  middleware: (list: Middleware[]) => ServerFnBuilder;
  inputValidator: (fn: (input: unknown) => unknown) => ServerFnBuilder;
  validator: (fn: (input: unknown) => unknown) => ServerFnBuilder;
  handler: (fn: Handler, id?: string) => (options?: { data?: unknown }) => Promise<unknown>;
}

export function createServerFn(options: { method?: string } = {}): ServerFnBuilder {
  const entry: Omit<Entry, "handler"> = { method: options.method ?? "POST", middleware: [] };
  const builder: ServerFnBuilder = {
    middleware(list) {
      entry.middleware = [...entry.middleware, ...list];
      return builder;
    },
    inputValidator(fn) {
      entry.validator = fn;
      return builder;
    },
    validator(fn) {
      entry.validator = fn;
      return builder;
    },
    handler(fn, id) {
      if (!id)
        throw new Error("Server function handler was not compiled; check next.config.ts loaders.");
      const complete: Entry = { ...entry, handler: fn };
      registry.set(id, complete);
      return (call = {}) => executeServerFn(complete, call.data);
    },
  };
  return builder;
}

export function useServerFn<T>(fn: T): T {
  return fn;
}
