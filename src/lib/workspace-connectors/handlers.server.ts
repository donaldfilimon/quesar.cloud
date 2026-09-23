/**
 * The logic behind each `/api/workspace/*` server route, one function per
 * route. Each takes the already-verified `userId` from `gate.server.ts`, never
 * a client-sent id, and returns a `Response`.
 *
 * Ported from mlai `app/api/workspace/**` and `src/lib/server/workspace-route.ts`
 * (b6f3686). The WorkOS session + organization gate became Better Auth plus
 * Fetch-Metadata isolation (`gate.server.ts`); the in-memory rate limiter
 * became the database-backed `workspace` bucket; KMS became `crypto.server.ts`.
 */
import { randomBytes } from "node:crypto";
import { features } from "@/lib/server/config.server";
import {
  EncryptionUnavailableError,
  SealedDataError,
  encryptionConfigured,
} from "@/lib/server/crypto.server";
import {
  WORKSPACE_PROVIDERS,
  buildAuthorizeUrl,
  clearWorkspaceStateCookie,
  createPkceVerifier,
  decodeWorkspaceState,
  encodePendingFlow,
  encodeWorkspaceState,
  exchangeAuthorizationCode,
  isWorkspaceProvider,
  pkceChallenge,
  providerCredentials,
  providerLabel,
  readPendingFlow,
  requestOrigin,
  timingSafeEqualString,
  workspaceRedirectUri,
  workspaceStateCookie,
  type WorkspaceProvider,
} from "./oauth.server";
import { fetchAccountEmail } from "./remote.server";
import type { WorkspaceFile } from "./sources";
import {
  WorkspaceNotConnectedError,
  getWorkspaceAccessToken,
  listWorkspaceConnections,
  revokeAndDeleteWorkspaceConnection,
  saveWorkspaceConnection,
} from "./tokens.server";

/**
 * File listings and connection rows are per-user private data. `private,
 * no-store` keeps them out of shared caches and the browser's disk cache.
 */
export const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** Why Connect is unavailable, or null when it can run. */
export type ConnectBlocker = "provider_not_configured" | "encryption_not_configured";

/**
 * A provider can be connected only when its OAuth client is configured AND a
 * valid `APP_ENCRYPTION_KEY` exists to seal the refresh token. Checked before a
 * flow starts, so a provider code is never spent on a token we could not store.
 */
export function connectBlocker(provider: WorkspaceProvider): ConnectBlocker | null {
  const flags = features();
  if (!(provider === "google" ? flags.google : flags.microsoft)) return "provider_not_configured";
  if (!encryptionConfigured()) return "encryption_not_configured";
  return null;
}

function redirect(request: Request, query: string, clearState: boolean): Response {
  const headers = new Headers({
    Location: `${requestOrigin(request)}/console/workspace${query}`,
    "Cache-Control": "no-store",
  });
  if (clearState) headers.set("Set-Cookie", clearWorkspaceStateCookie());
  return new Response(null, { status: 302, headers });
}

/* ── connect ──────────────────────────────────────────────────────────────── */

/**
 * Start the OAuth flow for one provider. Mints a single-use nonce plus a PKCE
 * verifier, stores both in an HttpOnly `__Host-` cookie bound to the provider,
 * and redirects to the provider's consent screen. Nothing is written to the
 * database until the callback succeeds.
 */
export function startConnect(request: Request, providerParam: string): Response {
  if (!isWorkspaceProvider(providerParam))
    return redirect(request, "?error=unknown_provider", false);
  const provider = providerParam;

  const blocker = connectBlocker(provider);
  const credentials = providerCredentials(provider);
  if (blocker || !credentials) {
    return redirect(request, `?error=${blocker ?? "provider_not_configured"}`, false);
  }

  const nonce = randomBytes(32).toString("base64url");
  const verifier = createPkceVerifier();
  const state = encodeWorkspaceState(nonce, provider);
  const redirectUri = workspaceRedirectUri(requestOrigin(request), provider);

  return new Response(null, {
    status: 302,
    headers: {
      Location: buildAuthorizeUrl(
        provider,
        credentials,
        state,
        pkceChallenge(verifier),
        redirectUri,
      ),
      "Set-Cookie": workspaceStateCookie(encodePendingFlow({ nonce, verifier, provider })),
      "Cache-Control": "no-store",
    },
  });
}

/* ── callback ─────────────────────────────────────────────────────────────── */

/**
 * Finish the OAuth flow: verify the CSRF nonce, exchange the code, seal and
 * store only the refresh token, and return the user to the console.
 *
 * The nonce is single-use: every terminal path clears the cookie, so a failed
 * or abandoned attempt cannot leave a live nonce for a later forged callback.
 * The state check runs before the code is spent.
 */
export async function finishCallback(
  request: Request,
  providerParam: string,
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const finish = (query: string) => redirect(request, query, true);
  if (!isWorkspaceProvider(providerParam)) return finish("?error=unknown_provider");
  const provider = providerParam;

  const url = new URL(request.url);
  const denied = url.searchParams.get("error");
  if (denied) return finish(`?error=${encodeURIComponent(denied.slice(0, 64))}`);

  const code = url.searchParams.get("code");
  if (!code) return finish("?error=missing_code");

  // CSRF gate. An attacker can navigate this browser here with their own
  // authorization code; they cannot set the pending-flow cookie. The flow also
  // has to be for THIS provider, so a Google callback cannot consume a pending
  // Microsoft flow (and spend its PKCE verifier).
  const state = decodeWorkspaceState(url.searchParams.get("state"));
  const pending = readPendingFlow(request);
  if (
    !state ||
    !pending ||
    state.provider !== provider ||
    pending.provider !== provider ||
    !timingSafeEqualString(state.nonce, pending.nonce)
  ) {
    console.warn("[Workspace] Rejected callback: missing or mismatched state nonce");
    return finish("?error=invalid_state");
  }

  const blocker = connectBlocker(provider);
  const credentials = providerCredentials(provider);
  if (blocker || !credentials) return finish(`?error=${blocker ?? "provider_not_configured"}`);

  try {
    const redirectUri = workspaceRedirectUri(requestOrigin(request), provider);
    const tokens = await exchangeAuthorizationCode(
      provider,
      credentials,
      code,
      pending.verifier,
      redirectUri,
      fetchImpl,
    );
    if (!tokens.refreshToken) {
      // Without a refresh token the connection dies when the access token
      // expires. Say so rather than storing something that stops working.
      return finish("?error=no_refresh_token");
    }
    // The access token is used once, here, and never persisted.
    const accountEmail = await fetchAccountEmail(
      provider === "google" ? "google-drive" : "sharepoint",
      tokens.accessToken,
      fetchImpl,
    );
    await saveWorkspaceConnection({
      userId,
      provider,
      refreshToken: tokens.refreshToken,
      accountEmail,
      scope: tokens.scope,
    });
    return finish(`?connected=${provider}`);
  } catch (error) {
    if (error instanceof EncryptionUnavailableError)
      return finish("?error=encryption_not_configured");
    // Message only, never the response body, which can echo the code.
    console.error("[Workspace] Connection failed:", error instanceof Error ? error.message : error);
    return finish("?error=connection_failed");
  }
}

/* ── connections ──────────────────────────────────────────────────────────── */

export interface ProviderConnectionRow {
  provider: WorkspaceProvider;
  label: string;
  /** Connect can run: OAuth client configured and the encryption key valid. */
  configured: boolean;
  /**
   * Why `configured` is false (a `ConnectBlocker`), or `reauth_required` when a
   * row exists but its token no longer opens (e.g. after a key rotation). Null
   * when there is nothing to report.
   */
  reason: ConnectBlocker | "reauth_required" | null;
  /** This user has a usable linked account. False while `reauth_required`. */
  connected: boolean;
  /** A stored row exists (usable or not); Disconnect can delete it. */
  stored: boolean;
  accountEmail: string | null;
  scope: string | null;
  connectedAt: string | null;
}

/**
 * Which providers this user has connected, and which are even available.
 * `configured` reflects server configuration; `connected` reflects this user.
 */
export async function listConnections(userId: string): Promise<Response> {
  try {
    const connections = await listWorkspaceConnections(userId);
    const byProvider = new Map(connections.map((row) => [row.provider, row]));
    const providers: ProviderConnectionRow[] = WORKSPACE_PROVIDERS.map((provider) => {
      const row = byProvider.get(provider);
      const blocker = connectBlocker(provider);
      const reauth = Boolean(row?.needsReauth);
      return {
        provider,
        label: providerLabel(provider),
        configured: blocker === null,
        reason: blocker ?? (reauth ? "reauth_required" : null),
        connected: Boolean(row) && !reauth,
        stored: Boolean(row),
        accountEmail: row?.accountEmail ?? null,
        scope: row?.scope ?? null,
        connectedAt: row?.connectedAt ?? null,
      };
    });
    return Response.json({ ok: true, providers }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    console.error(
      "[Workspace] Connection list failed:",
      error instanceof Error ? error.message : error,
    );
    return Response.json(
      { error: "Connections unavailable" },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }
}

/* ── disconnect ───────────────────────────────────────────────────────────── */

/** Drop a stored connection, revoking the grant at the provider first where possible. */
export async function disconnect(
  providerParam: string,
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (!isWorkspaceProvider(providerParam)) {
    return Response.json({ error: "Unknown provider" }, { status: 400, headers: PRIVATE_NO_STORE });
  }
  try {
    const result = await revokeAndDeleteWorkspaceConnection(userId, providerParam, fetchImpl);
    return Response.json({ ok: true, ...result }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    console.error("[Workspace] Disconnect failed:", error instanceof Error ? error.message : error);
    return Response.json(
      { error: "Could not disconnect" },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }
}

/* ── file listings ────────────────────────────────────────────────────────── */

/** Clamped: `days` is caller-supplied and bounds how much we ask a provider for. */
export function requestedDays(request: Request, fallback = 30): number {
  const raw = new URL(request.url).searchParams.get("days");
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 365);
}

/**
 * The body both file routes return.
 *
 * `connected: false` is a 200, not an error status: "you have not linked this
 * account" is a normal state of the panel. The client adapter turns it into
 * the `unconfigured` source state.
 */
export async function listSourceFiles(
  request: Request,
  provider: WorkspaceProvider,
  userId: string,
  list: (accessToken: string, days: number, signal: AbortSignal) => Promise<WorkspaceFile[]>,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const blocker = connectBlocker(provider);
  if (blocker) {
    return Response.json(
      { ok: true, connected: false, reason: blocker, files: [] },
      { headers: PRIVATE_NO_STORE },
    );
  }

  const controller = new AbortController();
  // Bound the upstream call so a hung provider cannot pin a serverless instance.
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const accessToken = await getWorkspaceAccessToken(userId, provider, fetchImpl);
    const files = await list(accessToken, requestedDays(request), controller.signal);
    return Response.json({ ok: true, connected: true, files }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    if (error instanceof WorkspaceNotConnectedError) {
      return Response.json(
        { ok: true, connected: false, reason: "not_connected", files: [] },
        { headers: PRIVATE_NO_STORE },
      );
    }
    if (error instanceof SealedDataError) {
      // The stored token no longer opens (key rotated or row tampered with).
      // The user must reconnect; that is a state, not an outage.
      return Response.json(
        { ok: true, connected: false, reason: "reauth_required", files: [] },
        { headers: PRIVATE_NO_STORE },
      );
    }
    // Message only: provider error bodies can echo the query or the token.
    console.error(
      `[Workspace] ${provider} listing failed:`,
      error instanceof Error ? error.message : error,
    );
    return Response.json(
      { error: "Source unavailable" },
      { status: 502, headers: PRIVATE_NO_STORE },
    );
  } finally {
    clearTimeout(timeout);
  }
}
