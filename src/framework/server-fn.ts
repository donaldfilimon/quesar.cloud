/**
 * Server functions and request scope for the site, on the Next.js App Router
 * (notes/superpowers/specs/2026-10-26-nextjs-app-router-port.md). The API is the
 * one the modules under `src/lib` were written against on TanStack Start:
 *
 *   export const getThing = createServerFn({ method: "GET" })
 *     .middleware([authMiddleware])
 *     .validator((input: unknown) => schema.parse(input))
 *     .handler(async ({ data, context }) => …);
 *
 * This file is the server implementation (and what the typechecker and vitest
 * see). `next.config.ts` swaps in `./server-fn.client.ts` for browser bundles and
 * `./server-fn.static.ts` for the static export. A webpack pre-loader
 * (scripts/next-transform.ts) gives every handler an id: on the server
 * `.handler(fn, id)` registers it for the dispatcher (app/api/server-fn), and in
 * the browser `.handler(id)` becomes an RPC call to it. Middleware runs in order,
 * then the validator, then the handler, with `next({ context })` merging context.
 */
import { AsyncLocalStorage } from "node:async_hooks";

type Context = Record<string, unknown>;

/** What a middleware's `next()` resolves to; return it from the middleware. */
export interface MiddlewareResult<C> {
  readonly context: C;
  readonly result?: unknown;
}

type NextFn<C> = <N extends Context = Record<never, never>>(options?: {
  context?: N;
}) => Promise<MiddlewareResult<C & N>>;

type MiddlewareServer<TIn, TOut> = (options: {
  next: NextFn<TIn>;
  context: TIn;
  data: unknown;
  request: Request;
}) => Promise<MiddlewareResult<TOut>> | MiddlewareResult<TOut>;

/** A function middleware; `C` is the context it adds. */
export interface FunctionMiddleware<C = unknown> {
  readonly dependencies: FunctionMiddleware[];
  readonly serverFn?: MiddlewareServer<unknown, unknown>;
  /** Type-only: the context this middleware provides. */
  readonly __context?: C;
}

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (
  i: infer I,
) => void
  ? I
  : never;
type ContextOf<M extends readonly FunctionMiddleware[]> =
  UnionToIntersection<
    M[number] extends FunctionMiddleware<infer C> ? (C extends Context ? C : never) : never
  > extends infer I
    ? I extends Context
      ? I
      : Context
    : Context;

interface MiddlewareBuilder<TIn extends Context> extends FunctionMiddleware<TIn> {
  middleware<M extends FunctionMiddleware[]>(list: M): MiddlewareBuilder<TIn & ContextOf<M>>;
  server<TOut>(fn: MiddlewareServer<TIn, TOut>): FunctionMiddleware<TOut> & {
    client: (fn: unknown) => FunctionMiddleware<TOut>;
  };
  client(fn: unknown): MiddlewareBuilder<TIn>;
}

export function createMiddleware(_options?: { type?: "function" | "request" }) {
  const state: {
    dependencies: FunctionMiddleware[];
    serverFn?: MiddlewareServer<unknown, unknown>;
  } = {
    dependencies: [],
  };
  const builder = {
    get dependencies() {
      return state.dependencies;
    },
    get serverFn() {
      return state.serverFn;
    },
    middleware(list: FunctionMiddleware[]) {
      state.dependencies = [...state.dependencies, ...list];
      return builder;
    },
    server(fn: MiddlewareServer<unknown, unknown>) {
      state.serverFn = fn;
      return builder;
    },
    client() {
      return builder;
    },
  };
  return builder as unknown as MiddlewareBuilder<Record<never, never>>;
}

function flatten(
  list: FunctionMiddleware[],
  seen = new Set<FunctionMiddleware>(),
): FunctionMiddleware[] {
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

/** Run `fn` with `request` as the current request; headers it sets come back alongside. */
export function runWithRequest<T>(request: Request, fn: () => Promise<T> | T) {
  const headers = new Headers();
  return scope.run({ request, headers }, async () => ({ value: await fn(), headers }));
}

/** The request being handled (inside a server function or a server route). */
export function getRequest(): Request {
  const current = scope.getStore();
  if (!current) throw new Error("getRequest() called outside a server function or API route.");
  return current.request;
}

/** Set a header on the response of the current server function or server route. */
export function setResponseHeader(name: string, value: string) {
  scope.getStore()?.headers.set(name, value);
}

/* ------------------------------------------------------------- server functions */

type Handler = (options: { data: unknown; context: Context; method: string }) => unknown;
export interface ServerFnEntry {
  method: string;
  middleware: FunctionMiddleware[];
  validator?: (input: unknown) => unknown;
  handler: Handler;
}

const registry = new Map<string, ServerFnEntry>();

export function lookupServerFn(id: string): ServerFnEntry | undefined {
  return registry.get(id);
}

export async function executeServerFn(entry: ServerFnEntry, data: unknown): Promise<unknown> {
  const chain = flatten(entry.middleware);
  const request = scope.getStore()?.request ?? new Request("http://localhost/");
  const run = async (index: number, context: Context): Promise<MiddlewareResult<Context>> => {
    if (index < chain.length) {
      const server = chain[index].serverFn;
      if (!server) return run(index + 1, context);
      return (await server({
        context,
        data,
        request,
        next: ((options?: { context?: Context }) =>
          run(index + 1, { ...context, ...options?.context })) as NextFn<unknown>,
      })) as MiddlewareResult<Context>;
    }
    const input = entry.validator ? await entry.validator(data) : data;
    return { context, result: await entry.handler({ data: input, context, method: entry.method }) };
  };
  return (await run(0, {})).result;
}

/** A Standard Schema (zod 4 and others): `.validator(schema)` as TanStack accepts it. */
interface StandardSchema<TIn, TOut> {
  readonly "~standard": {
    readonly validate: (value: unknown) => unknown;
    readonly types?: { readonly input: TIn; readonly output: TOut };
  };
}
type Validator<TIn, TOut> = ((input: TIn) => TOut) | StandardSchema<TIn, TOut>;

interface StandardResult {
  value?: unknown;
  issues?: ReadonlyArray<{ message: string }>;
}

/** A function validator runs as is; a schema validates with `~standard` and throws on issues. */
function toValidator(validator: Validator<unknown, unknown>): (input: unknown) => unknown {
  if (typeof validator === "function") return validator;
  return async (input) => {
    const result = (await validator["~standard"].validate(input)) as StandardResult;
    if (result.issues) {
      const error = new Error(result.issues.map((issue) => issue.message).join("; "));
      error.name = "ValidationError";
      throw error;
    }
    return result.value;
  };
}

interface CallOptions<TInput> {
  data: TInput;
  signal?: AbortSignal;
}
/** A callable server function: `fn()` or `fn({ data })`, resolving to the handler's result. */
export type ServerFn<TInput, TResult> = undefined extends TInput
  ? (options?: Partial<CallOptions<TInput>>) => Promise<TResult>
  : (options: CallOptions<TInput>) => Promise<TResult>;

interface ServerFnBuilder<TContext, TInput, TData> {
  middleware<M extends FunctionMiddleware[]>(
    list: M,
  ): ServerFnBuilder<TContext & ContextOf<M>, TInput, TData>;
  validator<TIn, TOut>(fn: Validator<TIn, TOut>): ServerFnBuilder<TContext, TIn, Awaited<TOut>>;
  inputValidator<TIn, TOut>(
    fn: Validator<TIn, TOut>,
  ): ServerFnBuilder<TContext, TIn, Awaited<TOut>>;
  handler<R>(
    fn: (options: { data: TData; context: TContext; method: string }) => R,
    id?: string,
  ): ServerFn<TInput, Awaited<R>>;
}

export function createServerFn(
  options: { method?: "GET" | "POST" } = {},
): ServerFnBuilder<Record<never, never>, undefined, undefined> {
  const entry: Omit<ServerFnEntry, "handler"> = {
    method: options.method ?? "POST",
    middleware: [],
  };
  const builder = {
    middleware(list: FunctionMiddleware[]) {
      entry.middleware = [...entry.middleware, ...list];
      return builder;
    },
    validator(fn: Validator<unknown, unknown>) {
      entry.validator = toValidator(fn);
      return builder;
    },
    inputValidator(fn: Validator<unknown, unknown>) {
      entry.validator = toValidator(fn);
      return builder;
    },
    handler(fn: Handler, id?: string) {
      const complete: ServerFnEntry = { ...entry, handler: fn };
      // Without an id (vitest, which does not run the build loader) the function is
      // callable directly but not reachable through the dispatcher.
      if (id) registry.set(id, complete);
      return (call: { data?: unknown } = {}) => executeServerFn(complete, call.data);
    },
  };
  return builder as unknown as ServerFnBuilder<Record<never, never>, undefined, undefined>;
}

/** Returns the function itself: server functions are plain async functions here. */
export function useServerFn<T>(fn: T): T {
  return fn;
}
