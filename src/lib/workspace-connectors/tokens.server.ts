/**
 * Sealed storage for workspace refresh tokens, and access-token minting.
 *
 * What is persisted: the refresh token only, sealed with AES-256-GCM under
 * `APP_ENCRYPTION_KEY` (`src/lib/server/crypto.server.ts`) into
 * `workspace_connections.sealed`. The additional authenticated data is
 * `workspace:<provider>:<userId>`, so a sealed value lifted into another user's
 * row (or another provider's) fails to open instead of handing someone else's
 * Drive to the wrong account.
 *
 * What is not persisted: access tokens. They are short-lived, minted on demand
 * from the refresh token, and cached only in this process's memory. Nothing
 * here is ever returned to the browser: the panel calls our routes, and our
 * routes call the provider.
 *
 * Fail closed: without a valid key, `seal`/`open` throw
 * `EncryptionUnavailableError`, and the connect route refuses before a flow
 * starts. Nothing is ever stored in plaintext.
 *
 * Ported from mlai `src/lib/server/workspace-tokens.ts` (b6f3686), with Cloud
 * KMS envelope encryption replaced by `crypto.server.ts` (spec decision 3).
 */
import { getSql } from "@/lib/db";
import { open, seal } from "@/lib/server/crypto.server";
import {
  providerCredentials,
  refreshAccessToken,
  revokeGrant,
  type WorkspaceProvider,
} from "./oauth.server";

declare global {
  var __quesarWorkspaceAccessTokens: Map<string, { token: string; expiresAt: number }> | undefined;
}

/** Binds a sealed refresh token to exactly one user and provider. */
export function workspaceAad(userId: string, provider: WorkspaceProvider): string {
  return `workspace:${provider}:${userId}`;
}

export interface WorkspaceConnectionSummary {
  provider: WorkspaceProvider;
  accountEmail: string | null;
  scope: string | null;
  connectedAt: string;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? String(value) : new Date(parsed).toISOString();
}

/** Persist (or replace) a user's refresh token for one provider. */
export async function saveWorkspaceConnection(input: {
  userId: string;
  provider: WorkspaceProvider;
  refreshToken: string;
  accountEmail: string | null;
  scope: string | null;
}): Promise<void> {
  // Seal before touching the database: a missing key throws here and nothing
  // is written.
  const sealed = seal(input.refreshToken, workspaceAad(input.userId, input.provider));
  const sql = await getSql();
  await sql`
    insert into workspace_connections (user_id, provider, account_email, scope, sealed, updated_at)
    values (${input.userId}, ${input.provider}, ${input.accountEmail}, ${input.scope}, ${sealed}, now())
    on conflict (user_id, provider) do update set
      account_email = excluded.account_email,
      scope = excluded.scope,
      sealed = excluded.sealed,
      updated_at = now()`;
  // A replaced token invalidates anything cached for the old one.
  accessTokenCache().delete(cacheKey(input.userId, input.provider));
}

export async function listWorkspaceConnections(userId: string): Promise<WorkspaceConnectionSummary[]> {
  const sql = await getSql();
  const rows = await sql<{
    provider: WorkspaceProvider;
    account_email: string | null;
    scope: string | null;
    connected_at: unknown;
  }>`
    select provider, account_email, scope, connected_at
    from workspace_connections
    where user_id = ${userId}
    order by provider`;
  return rows.map((row) => ({
    provider: row.provider,
    accountEmail: row.account_email,
    scope: row.scope,
    connectedAt: iso(row.connected_at),
  }));
}

export async function deleteWorkspaceConnection(userId: string, provider: WorkspaceProvider): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql`
    delete from workspace_connections
    where user_id = ${userId} and provider = ${provider}
    returning provider`;
  accessTokenCache().delete(cacheKey(userId, provider));
  return rows.length > 0;
}

/**
 * Disconnect properly: revoke the grant at the provider where that is
 * possible, then drop the local record.
 *
 * The delete happens whether or not the revoke succeeds. A user who pressed
 * Disconnect must end up disconnected; leaving the row behind because Google
 * was briefly unreachable would be the worse failure. `revoked` is reported
 * back so the panel can tell them when the grant still needs clearing on the
 * provider's side.
 */
export async function revokeAndDeleteWorkspaceConnection(
  userId: string,
  provider: WorkspaceProvider,
  fetchImpl: typeof fetch = fetch,
): Promise<{ removed: boolean; revoked: boolean }> {
  let revoked = false;
  try {
    const credentials = providerCredentials(provider);
    const refreshToken = credentials ? await readRefreshToken(userId, provider) : null;
    if (credentials && refreshToken) {
      revoked = await revokeGrant(provider, credentials, refreshToken, fetchImpl);
    }
  } catch (error) {
    // A token we cannot open is a token we cannot revoke; deleting it is still
    // correct, and is what actually stops this service using it.
    console.warn(
      `[Workspace] Could not revoke ${provider} grant before disconnect:`,
      error instanceof Error ? error.message : error,
    );
  }
  const removed = await deleteWorkspaceConnection(userId, provider);
  return { removed, revoked };
}

/**
 * Open the stored refresh token for this (user, provider), or null when there
 * is no row. Throws `SealedDataError` when the row's sealed value was not
 * sealed for this pair, and `EncryptionUnavailableError` without a key.
 */
export async function readRefreshToken(userId: string, provider: WorkspaceProvider): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ sealed: string }>`
    select sealed from workspace_connections
    where user_id = ${userId} and provider = ${provider}`;
  const row = rows[0];
  if (!row) return null;
  return open(row.sealed, workspaceAad(userId, provider));
}

function accessTokenCache(): Map<string, { token: string; expiresAt: number }> {
  globalThis.__quesarWorkspaceAccessTokens ??= new Map();
  return globalThis.__quesarWorkspaceAccessTokens;
}

function cacheKey(userId: string, provider: WorkspaceProvider): string {
  return `${provider}:${userId}`;
}

/** Distinguishes "this user has not connected" from "the call failed". */
export class WorkspaceNotConnectedError extends Error {
  constructor(public readonly provider: WorkspaceProvider) {
    super(`${provider} is not connected for this user`);
    this.name = "WorkspaceNotConnectedError";
  }
}

/**
 * Mint an access token for one user and provider, refreshing through the
 * stored refresh token when the cached one has expired.
 *
 * Throws `WorkspaceNotConnectedError` when there is no connection or the
 * provider has no credentials configured: both are "not connected" from the
 * panel's point of view, and the route renders them as such.
 */
export async function getWorkspaceAccessToken(
  userId: string,
  provider: WorkspaceProvider,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const cached = accessTokenCache().get(cacheKey(userId, provider));
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const credentials = providerCredentials(provider);
  if (!credentials) throw new WorkspaceNotConnectedError(provider);

  const refreshToken = await readRefreshToken(userId, provider);
  if (!refreshToken) throw new WorkspaceNotConnectedError(provider);

  const refreshed = await refreshAccessToken(provider, credentials, refreshToken, fetchImpl);

  // Providers that rotate refresh tokens hand back a new one; persisting it is
  // not optional, because the old one stops working the moment it is used.
  if (refreshed.refreshToken && refreshed.refreshToken !== refreshToken) {
    const sealed = seal(refreshed.refreshToken, workspaceAad(userId, provider));
    const sql = await getSql();
    await sql`
      update workspace_connections set sealed = ${sealed}, updated_at = now()
      where user_id = ${userId} and provider = ${provider}`;
  }

  accessTokenCache().set(cacheKey(userId, provider), {
    token: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
  });
  return refreshed.accessToken;
}
