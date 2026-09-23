/**
 * Optional runtime configuration for the features merged from mlai.
 *
 * Every value is optional. A missing value never crashes a request: callers ask
 * `features()` and render an honest "not configured" state instead. Never
 * commit `.env` files; values come from the deploy environment (`.env.local` is git-ignored for local use).
 */
import { env } from "@/lib/env.server";
import { readBillingConfig } from "@/lib/billing";
import { encryptionConfigured } from "./crypto.server";

export type LlmProviderId = "xai" | "gemini";

export interface GatewayConfig {
  url: string;
  token: string;
  gatewayId: string;
}

/** Cloudflare AI Gateway (→ Gemini). Throws on a malformed URL: a set-but-wrong value is a misconfig, not "off". */
export function gatewayConfig(): GatewayConfig | null {
  const rawUrl = env("CLOUDFLARE_AI_GATEWAY_URL");
  const token = env("CLOUDFLARE_AI_GATEWAY_TOKEN");
  const gatewayId = env("CLOUDFLARE_AI_GATEWAY_ID");
  if (!rawUrl || !token || !gatewayId) return null;
  const url = new URL(rawUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "api.cloudflare.com" ||
    !/^\/client\/v4\/accounts\/[^/]+\/ai\/v1\/chat\/completions$/.test(url.pathname) ||
    url.search ||
    url.hash
  ) {
    throw new Error("CLOUDFLARE_AI_GATEWAY_URL must be the Cloudflare AI REST chat-completions endpoint");
  }
  return { url: url.toString(), token, gatewayId };
}

function gatewayConfigured(): boolean {
  try {
    return gatewayConfig() !== null;
  } catch {
    return false;
  }
}

/**
 * Which LLM provider to use. `LLM_PROVIDER` pins one; unset picks the first
 * configured of xAI, then Gemini. Null means no provider is configured.
 */
export function llmProvider(): LlmProviderId | null {
  const pinned = env("LLM_PROVIDER")?.toLowerCase();
  if (pinned === "xai") return env("XAI_API_KEY") ? "xai" : null;
  if (pinned === "gemini") return gatewayConfigured() ? "gemini" : null;
  if (env("XAI_API_KEY")) return "xai";
  if (gatewayConfigured()) return "gemini";
  return null;
}

/** Lower-cased admin allowlist from `ADMIN_EMAILS` (comma or whitespace separated). */
export function adminEmails(): Set<string> {
  const raw = env("ADMIN_EMAILS") ?? "";
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export interface FeatureFlags {
  llm: boolean;
  encryption: boolean;
  admin: boolean;
  google: boolean;
  microsoft: boolean;
  billing: boolean;
  turnstile: boolean;
  quasar: boolean;
}

/** Which optional features have the configuration they need. Safe to send to the client. */
export function features(): FeatureFlags {
  return {
    llm: llmProvider() !== null,
    // A set-but-malformed key is not configured: sealing would throw.
    encryption: encryptionConfigured(),
    admin: adminEmails().size > 0,
    google: Boolean(env("GOOGLE_OAUTH_CLIENT_ID") && env("GOOGLE_OAUTH_CLIENT_SECRET")),
    microsoft: Boolean(env("MICROSOFT_OAUTH_CLIENT_ID") && env("MICROSOFT_OAUTH_CLIENT_SECRET")),
    // Same rule as the profile billing card: only a valid https link counts.
    billing: readBillingConfig(env).state === "configured",
    turnstile: Boolean(env("TURNSTILE_SITE_KEY") && env("TURNSTILE_SECRET")),
    quasar: Boolean(env("QUASAR_SERVICE_ORIGIN")),
  };
}
