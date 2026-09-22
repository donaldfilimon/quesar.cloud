/**
 * Browser-side calls to the `/api/workspace/*` server routes. Client-safe: no
 * server imports, and no provider token ever passes through here.
 */
import { getBearerToken } from "@/lib/auth/client";
import type { WorkspaceProviderSlug } from "./sources";

/**
 * The live preview runs in a partitioned iframe whose session cookie does not
 * reach the server, so fetches forward the session as a bearer token (the same
 * thing `authMiddleware` does for server functions). Deployed, this is empty.
 */
export function sessionHeaders(): Record<string, string> {
  const token = getBearerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** One row of `/api/workspace/connections`. */
export interface ProviderConnection {
  provider: WorkspaceProviderSlug;
  label: string;
  /** Connect can run: OAuth client configured and the encryption key valid. */
  configured: boolean;
  reason: "provider_not_configured" | "encryption_not_configured" | null;
  /** This user has linked an account. */
  connected: boolean;
  accountEmail: string | null;
  scope: string | null;
  connectedAt: string | null;
}

export type ConnectionsResult =
  | { ok: true; providers: Partial<Record<WorkspaceProviderSlug, ProviderConnection>> }
  | { ok: false; status: number };

export async function fetchConnections(signal?: AbortSignal): Promise<ConnectionsResult> {
  const response = await fetch("/api/workspace/connections", {
    signal,
    headers: { accept: "application/json", ...sessionHeaders() },
  });
  if (!response.ok) return { ok: false, status: response.status };
  const body: unknown = await response.json();
  const rows = body && typeof body === "object" ? (body as { providers?: unknown }).providers : null;
  const providers: Partial<Record<WorkspaceProviderSlug, ProviderConnection>> = {};
  if (Array.isArray(rows)) {
    for (const row of rows as ProviderConnection[]) {
      if (row && (row.provider === "google" || row.provider === "microsoft")) providers[row.provider] = row;
    }
  }
  return { ok: true, providers };
}

export async function disconnectProvider(
  provider: WorkspaceProviderSlug,
): Promise<{ ok: boolean; revoked: boolean }> {
  const response = await fetch(`/api/workspace/disconnect/${provider}`, {
    method: "POST",
    headers: { accept: "application/json", ...sessionHeaders() },
  });
  if (!response.ok) return { ok: false, revoked: false };
  const body = (await response.json()) as { revoked?: unknown };
  return { ok: true, revoked: body.revoked === true };
}

/** The Connect link. A plain navigation: the route answers with a redirect to the provider. */
export function connectHref(provider: WorkspaceProviderSlug): string {
  return `/api/workspace/connect/${provider}`;
}

const CALLBACK_ERRORS: Record<string, string> = {
  provider_not_configured: "That provider has no OAuth client configured on this deployment.",
  encryption_not_configured: "APP_ENCRYPTION_KEY is not set, so tokens cannot be stored. Connect is disabled.",
  invalid_state: "The sign-in round trip could not be verified. Start the connection again.",
  missing_code: "The provider returned no authorization code.",
  no_refresh_token: "The provider returned no refresh token, so the connection would stop working within an hour.",
  connection_failed: "The connection could not be completed.",
  unknown_provider: "Unknown provider.",
  access_denied: "Access was not granted.",
};

/** Map the `?error=` code the callback redirects with to a sentence. Unknown codes are not echoed. */
export function describeCallbackError(code: string): string {
  return CALLBACK_ERRORS[code] ?? "The provider reported an error.";
}
