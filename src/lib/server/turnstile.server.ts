/**
 * Cloudflare Turnstile server-side verification (ported from mlai
 * `lib/server/turnstile.ts`).
 *
 * mlai always required a token. Here Turnstile is optional: with no site key
 * and secret the contact form works without a challenge (still rate-limited).
 * Once the key and secret are set, verification fails closed, and a missing
 * `TURNSTILE_HOSTNAMES` allowlist is a misconfiguration, not a bypass.
 */
import { env } from "@/lib/env.server";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

/**
 * - `off`: no site key or secret, so no challenge is shown or checked.
 * - `ready`: key, secret and hostname allowlist all set.
 * - `misconfigured`: key and secret set but no hostname allowlist; every
 *   submission is refused rather than silently skipping the check.
 *
 * The widget and the server both key off this one predicate, so the page never
 * hides the widget while the server demands a token.
 */
export type TurnstileState = "off" | "ready" | "misconfigured";

function expectedHostnames(): Set<string> {
  return new Set(
    (env("TURNSTILE_HOSTNAMES") ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function turnstileState(): TurnstileState {
  if (!env("TURNSTILE_SITE_KEY") || !env("TURNSTILE_SECRET")) return "off";
  return expectedHostnames().size > 0 ? "ready" : "misconfigured";
}

/** The public site key, only when verification is fully configured. */
export function turnstileSiteKey(): string | null {
  return turnstileState() === "ready" ? (env("TURNSTILE_SITE_KEY") ?? null) : null;
}

function requesterIp(req: Request): string | undefined {
  const connectingIp = req.headers.get("cf-connecting-ip")?.trim();
  if (connectingIp) return connectingIp;
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

export async function verifyTurnstile(
  req: Request,
  token: string,
  expectedAction: string,
): Promise<boolean> {
  const secret = env("TURNSTILE_SECRET") ?? "";
  const hostnames = expectedHostnames();
  if (!secret || hostnames.size === 0 || token.length < 10 || token.length > 4096) return false;

  const remoteip = requesterIp(req);
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as SiteverifyResult;
    return (
      result.success === true &&
      result.action === expectedAction &&
      typeof result.hostname === "string" &&
      hostnames.has(result.hostname.toLowerCase())
    );
  } catch (error) {
    console.error(
      "Turnstile verification failed closed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return false;
  }
}
