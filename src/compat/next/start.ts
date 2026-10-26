/**
 * `@tanstack/react-start` for the Next.js static build. Server functions keep their
 * call signatures, but there is no server behind them yet: the static build renders
 * `ServerOnlyNotice` before any of them is called (src/lib/static-site.ts), and a
 * call that slips through rejects instead of touching the network. Stage 2 of the
 * port replaces these with route handlers and server actions.
 */
const unavailable = () =>
  Promise.reject(new Error("Server functions are not available in the Next.js static build."));

interface ServerFnBuilder {
  middleware: (...args: unknown[]) => ServerFnBuilder;
  inputValidator: (...args: unknown[]) => ServerFnBuilder;
  validator: (...args: unknown[]) => ServerFnBuilder;
  handler: (fn: unknown) => typeof unavailable;
}

function builder(): ServerFnBuilder {
  const self: ServerFnBuilder = {
    middleware: () => self,
    inputValidator: () => self,
    validator: () => self,
    handler: () => unavailable,
  };
  return self;
}

export function createServerFn(_options?: unknown): ServerFnBuilder {
  return builder();
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

export function createCsrfMiddleware(_options?: unknown): MiddlewareBuilder {
  return createMiddleware();
}

export function createStart(_options?: unknown) {
  return {};
}

export function useServerFn<T>(fn: T): T {
  return fn;
}

export function getRequest(): never {
  throw new Error("No request: the Next.js static build has no server runtime.");
}
