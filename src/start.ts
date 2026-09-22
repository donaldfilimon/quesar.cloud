import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

/**
 * TanStack Start instance.
 *
 * Creating this file REPLACES Start's built-in request middleware, which is
 * exactly the CSRF check below (`createStartHandler`'s `defaultCsrfMiddleware`).
 * Keep `csrf` first and unchanged, or every server function loses its
 * cross-site protection.
 */
const csrf = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });

/** Report-only CSP on page and server-route responses (policy: `src/lib/server/csp.ts`). */
const csp = createMiddleware({ type: "request" }).server(async ({ next, handlerType }) => {
  if (handlerType === "router") {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    const { buildCsp, CSP_HEADER, REPORTING_ENDPOINTS } = await import("@/lib/server/csp");
    setResponseHeader(CSP_HEADER, buildCsp({ dev: import.meta.env.DEV }));
    setResponseHeader("Reporting-Endpoints", REPORTING_ENDPOINTS);
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrf, csp],
}));
