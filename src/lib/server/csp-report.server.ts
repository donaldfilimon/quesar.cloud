/**
 * CSP violation sink (ported from mlai `app/api/csp-report`).
 *
 * The policy (`csp.ts`) is a hand-curated allowlist over a moving surface, and
 * it ships as Report-Only, so these reports are the only signal of what an
 * enforced policy would break.
 *
 * Privacy: nothing is persisted. Reports carry full URLs and user-agent
 * context, so they go to stdout only (the platform's log retention applies),
 * never to `telemetry_events`.
 *
 * Browsers post without credentials and expect a fast, bodyless reply. Never
 * gate this on a session, and never answer 5xx.
 */
import { payloadTooLarge, readBodyLimited } from "./body-limit.server";
import { clientSubject, hit, LIMITS } from "./rate-limit.server";

/** Only the first 2000 characters of a report are logged. */
export const CSP_LOG_LIMIT = 2000;

export async function handleCspReport(req: Request, now?: number): Promise<Response> {
  // First statement on purpose: the body read below still buffers up to the
  // cap, so a limiter placed after it would already have paid that cost.
  // One broken directive can emit tens of reports per page load; the useful
  // content is "directive D blocked URI U", which report #1 already carries.
  try {
    const { allowed } = await hit("csp-report", clientSubject(req), LIMITS.cspReport, now);
    if (!allowed)
      return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  } catch (error) {
    console.error(
      "CSP report rate limit unavailable:",
      error instanceof Error ? error.message : "unknown error",
    );
    return new Response(null, { status: 204 });
  }

  // 64 KB cap: real reports are a few hundred bytes. `readBodyLimited` never
  // rejects, so an aborted read is a 413, not a 500.
  const raw = await readBodyLimited(req, 64 * 1024);
  if (raw === null) return payloadTooLarge();

  // Two wire formats: legacy `report-uri` ({"csp-report": {...}}) and the
  // Reporting API batch used by `report-to` (an array). Log whichever arrived.
  if (raw) console.warn("[CSP] violation report:", raw.slice(0, CSP_LOG_LIMIT));

  return new Response(null, { status: 204 });
}
