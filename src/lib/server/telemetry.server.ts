/**
 * Anonymous first-party telemetry sink (ported from mlai `app/api/telemetry`).
 *
 * Stores an allowlisted event name + an allowlisted pathname + a timestamp.
 * No user id, no IP, no cookie. Honors DNT / Sec-GPC before anything else, so
 * an opted-out visitor costs not even a rate-limit write.
 *
 * Always 204 except for malformed requests (413 oversize body, 400 non-object
 * JSON or unknown event) and 429 when the caller is over the limit. Sink
 * failures (database, limiter) are swallowed: telemetry must never affect the
 * user-facing flow.
 */
import { getSql } from "@/lib/db";
import { readJsonLimited } from "./body-limit.server";
import { clientSubject, hit, LIMITS } from "./rate-limit.server";
import { normalizeTelemetryPath, type RoutePatterns } from "./telemetry-path";

/**
 * mlai allowed only the four inquiry-dialog events. `page_view` is new here:
 * the task adds route-change page views, sent by `src/lib/telemetry.ts`.
 */
export const TELEMETRY_EVENTS = new Set(["page_view", "inquiry_open", "inquiry_submit", "inquiry_success", "inquiry_close"]);

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function tooMany(): Response {
  return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
}

export async function handleTelemetry(req: Request, patterns: RoutePatterns, now?: number): Promise<Response> {
  if (req.headers.get("DNT") === "1" || req.headers.get("Sec-GPC") === "1") return noContent();

  try {
    const { allowed } = await hit("telemetry", clientSubject(req), LIMITS.telemetry, now);
    if (!allowed) return tooMany();
  } catch (error) {
    console.error("Telemetry rate limit unavailable:", error instanceof Error ? error.message : "unknown error");
    return noContent();
  }

  // 4 KB cap: the payload is {event, path} only.
  const body = await readJsonLimited<{ event?: unknown; path?: unknown }>(req, 4 * 1024);
  if (body instanceof Response) return body;

  const event = typeof body.event === "string" ? body.event : "";
  if (!TELEMETRY_EVENTS.has(event)) {
    return Response.json({ error: "Unrecognized event name." }, { status: 400 });
  }
  const path = normalizeTelemetryPath(body.path, patterns);

  try {
    const sql = await getSql();
    await sql`insert into telemetry_events (event, path) values (${event}, ${path})`;
  } catch (error) {
    console.error("Database error saving telemetry event:", error instanceof Error ? error.message : "unknown error");
  }
  return noContent();
}
