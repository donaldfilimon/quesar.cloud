/**
 * TanStack Start's default CSRF rule for server functions (`createCsrfMiddleware()`
 * with no options, as `src/start.ts` configures it), vendored so it outlives the
 * TanStack packages: `Sec-Fetch-Site` must be `same-origin`; without it the
 * `Origin` must match; without that the `Referer` must be same-origin; a request
 * with none of the three is refused.
 */
function refererIsSameOrigin(referer: string, origin: string): boolean {
  if (referer === origin) return true;
  if (!referer.startsWith(origin)) return false;
  const next = referer.charCodeAt(origin.length);
  return next === 47 /* / */ || next === 63 /* ? */ || next === 35; /* # */
}

export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null) return fetchSite === "same-origin";
  const origin = new URL(request.url).origin;
  const sent = request.headers.get("Origin");
  if (sent !== null) return sent === origin;
  const referer = request.headers.get("Referer");
  return referer !== null && refererIsSameOrigin(referer, origin);
}
