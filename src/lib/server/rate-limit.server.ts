/**
 * Database-backed fixed-window rate limiter (replaces mlai's in-memory map,
 * which does not work across serverless instances).
 *
 * `subject` is a user id or `clientSubject()` of a request; never store a raw IP.
 */
import { getSql } from "@/lib/db";
import { createHmac } from "node:crypto";
import { env } from "@/lib/env.server";

export interface Limit {
  windowMs: number;
  max: number;
}

export const LIMITS = {
  llm: { windowMs: 60_000, max: 12 },
  inquiry: { windowMs: 10 * 60_000, max: 5 },
  telemetry: { windowMs: 60_000, max: 120 },
  cspReport: { windowMs: 60_000, max: 60 },
  workspace: { windowMs: 60_000, max: 60 },
} as const satisfies Record<string, Limit>;

export function windowStart(now: number, windowMs: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

/**
 * Count one hit. Returns `{ allowed, remaining }`. Old windows are pruned
 * opportunistically (about 1 in 50 calls) so the table stays small.
 */
export async function hit(
  bucket: string,
  subject: string,
  limit: Limit,
  now: number = Date.now(),
): Promise<{ allowed: boolean; remaining: number }> {
  const sql = await getSql();
  const start = windowStart(now, limit.windowMs);
  const rows = await sql<{ count: number }>`
    insert into rate_limits (bucket, subject, window_start, count)
    values (${bucket}, ${subject}, ${start.toISOString()}, 1)
    on conflict (bucket, subject, window_start)
    do update set count = rate_limits.count + 1
    returning count`;
  const count = Number(rows[0]?.count ?? 1);
  if (Math.random() < 0.02) {
    await sql`delete from rate_limits where window_start < ${new Date(now - 24 * 60 * 60_000).toISOString()}`;
  }
  return { allowed: count <= limit.max, remaining: Math.max(0, limit.max - count) };
}

/**
 * A stable, non-reversible subject for anonymous requests. Reads only headers
 * the deployment's proxy sets: `x-real-ip` (Vercel overwrites it), then the
 * rightmost `x-forwarded-for` hop. `cf-connecting-ip` is passed through
 * unchanged by Vercel, so it is trusted only when `TRUSTED_PROXY=cloudflare`
 * says Cloudflare is in front. The IP is hashed with a server-side key and
 * never stored raw.
 */
export function clientSubject(request: Request): string {
  const headers = request.headers;
  const ip =
    (env("TRUSTED_PROXY") === "cloudflare" ? headers.get("cf-connecting-ip") : null) ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown";
  const salt = env("APP_ENCRYPTION_KEY") ?? env("BETTER_AUTH_SECRET") ?? "quesar-rate-limit";
  return createHmac("sha256", salt).update(`ip:${ip}`).digest("base64url").slice(0, 32);
}

export class RateLimitedError extends Error {
  readonly status = 429;
  constructor(message = "Too many requests. Try again shortly.") {
    super(message);
    this.name = "RateLimitedError";
  }
}
