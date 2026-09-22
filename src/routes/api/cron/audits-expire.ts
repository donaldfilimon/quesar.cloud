import { createFileRoute } from "@tanstack/react-router";

/**
 * Retention sweep for conversation audits (mlai `internal/audits/expire`,
 * which Cloud Scheduler called with an OIDC token). Here a Vercel cron calls
 * it with `Authorization: Bearer ${CRON_SECRET}`; without CRON_SECRET the
 * endpoint is off (503), never open.
 */
async function expire(request: Request): Promise<Response> {
  const { authorizeCron, expireAudits } = await import("@/lib/console.server");
  const { clientSubject, hit } = await import("@/lib/server/rate-limit.server");
  const headers = { "Cache-Control": "no-store" };
  // mlai rate-limited this endpoint to 5 calls a minute per client.
  const gate = await hit("audit-expiry", clientSubject(request), { windowMs: 60_000, max: 5 });
  if (!gate.allowed) return Response.json({ error: "Too many requests" }, { status: 429, headers });
  const verdict = authorizeCron(request);
  if (verdict === 503)
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503, headers });
  if (verdict === 401) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    const deleted = await expireAudits();
    return Response.json({ ok: true, deleted }, { headers });
  } catch (error) {
    console.error("Audit expiry failed:", error);
    return Response.json({ error: "Audit expiry failed" }, { status: 500, headers });
  }
}

export const Route = createFileRoute("/api/cron/audits-expire")({
  server: {
    handlers: {
      GET: ({ request }) => expire(request),
      POST: ({ request }) => expire(request),
    },
  },
});
