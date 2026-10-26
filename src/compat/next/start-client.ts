/**
 * `@tanstack/react-start` in browser bundles of the Next.js server build. The
 * loader (scripts/next-transform.ts) has already replaced every server-function
 * handler with its id, so `.handler(id)` returns a function that POSTs to the
 * dispatcher (`app/api/server-fn/[id]/route.server.ts`) and returns its result.
 */
import { decode, encode, SERVER_FN_PATH, type WireReply } from "./wire";

interface CallOptions {
  data?: unknown;
  signal?: AbortSignal;
}

/** Server errors keep their name and message, as TanStack's serializer keeps them. */
function rebuild(error: { name: string; message: string }): Error {
  const rebuilt = new Error(error.message);
  rebuilt.name = error.name;
  return rebuilt;
}

function remote(id: string) {
  return async (options: CallOptions = {}) => {
    const response = await fetch(`${SERVER_FN_PATH}${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: encode({ data: options.data }),
      credentials: "same-origin",
      signal: options.signal,
    });
    const text = await response.text();
    let reply: WireReply;
    try {
      reply = decode<WireReply>(text);
    } catch {
      throw new Error(`Server function ${id} failed (${response.status}).`);
    }
    if (!reply.ok) throw rebuild(reply.error);
    return reply.result;
  };
}

interface ServerFnBuilder {
  middleware: (...args: unknown[]) => ServerFnBuilder;
  inputValidator: (...args: unknown[]) => ServerFnBuilder;
  validator: (...args: unknown[]) => ServerFnBuilder;
  handler: (id: unknown) => ReturnType<typeof remote>;
}

export function createServerFn(_options?: unknown): ServerFnBuilder {
  const self: ServerFnBuilder = {
    middleware: () => self,
    inputValidator: () => self,
    validator: () => self,
    handler: (id) => {
      if (typeof id !== "string")
        throw new Error("Server function handler was not compiled; check next.config.ts loaders.");
      return remote(id);
    },
  };
  return self;
}

interface MiddlewareBuilder {
  middleware: (...args: unknown[]) => MiddlewareBuilder;
  server: (fn: unknown) => MiddlewareBuilder;
  client: (fn: unknown) => MiddlewareBuilder;
}

export function createMiddleware(_options?: unknown): MiddlewareBuilder {
  const self: MiddlewareBuilder = {
    middleware: () => self,
    server: () => self,
    client: () => self,
  };
  return self;
}

export const createCsrfMiddleware = createMiddleware;

export function createStart(_options?: unknown) {
  return {};
}

export function useServerFn<T>(fn: T): T {
  return fn;
}
