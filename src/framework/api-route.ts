/**
 * Adapts a server route (`createFileRoute(…)({ server: { handlers } })` in `src/routes`)
 * to Next.js route-handler exports. Handlers get `{ request, params }` as on
 * TanStack Start did, run inside the request scope that `getRequest()` reads, and
 * keep any headers set with `setResponseHeader`. A splat (`$`) arrives as
 * `_splat`, joined, as TanStack names it.
 */
import { runWithRequest } from "./server-fn";

type Params = Record<string, string | string[]>;
type ServerRouteHandler = (ctx: { request: Request; params: Record<string, string> }) => unknown;

interface ServerRoute {
  options: object;
}

/** Some responses (`Response.redirect`) have immutable headers, so merging rebuilds them. */
export function withHeaders(response: Response, extra: Headers): Response {
  if ([...extra.keys()].length === 0) return response;
  const headers = new Headers(response.headers);
  extra.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function routeHandler(route: ServerRoute, method: string) {
  return async (request: Request, context: { params: Promise<Params> }) => {
    const raw = await context.params;
    const params = Object.fromEntries(
      Object.entries(raw ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join("/") : value,
      ]),
    );
    const handlers = (
      route.options as { server?: { handlers?: Record<string, ServerRouteHandler> } }
    ).server?.handlers;
    const handler = handlers?.[method];
    if (!handler) return new Response(null, { status: 405 });
    const { value, headers } = await runWithRequest(request, async () =>
      handler({ request, params }),
    );
    return withHeaders(value instanceof Response ? value : Response.json(value), headers);
  };
}
