import { NextResponse, type NextRequest } from "next/server";

/**
 * Request middleware for the Next.js server build, ported from `src/start.ts`:
 *
 * - readiness: refuse runtime traffic until the deployment's configuration is
 *   sound, and answer `/api/readiness` (src/lib/server/readiness.server.ts);
 * - report-only CSP and its reporting endpoint on page responses
 *   (src/lib/server/csp.ts).
 *
 * CSRF for server functions is in their dispatcher (app/api/server-fn). The
 * `.server.ts` extension keeps this file out of the static export, which has no
 * request pipeline.
 */
export async function proxy(request: NextRequest) {
  const { checkRuntimeRequest } = await import("@/lib/server/readiness.server");
  const refused = checkRuntimeRequest(
    request,
    false,
    process.env.QUESAR_NEXT_PERSISTENT === "true",
  );
  if (refused) return refused;
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  const isPage = !pathname.startsWith("/api/") && !/\.[a-z0-9]+$/i.test(pathname);
  if (isPage) {
    const { buildCsp, CSP_HEADER, REPORTING_ENDPOINTS } = await import("@/lib/server/csp");
    response.headers.set(CSP_HEADER, buildCsp({ dev: process.env.NODE_ENV === "development" }));
    response.headers.set("Reporting-Endpoints", REPORTING_ENDPOINTS);
  }
  return response;
}

export const config = {
  // Build output and static files never reach the runtime services the readiness check guards.
  matcher: ["/((?!_next/static|_next/image|media/|og/|favicon\\.svg|og\\.jpg).*)"],
};
