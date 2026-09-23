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
 * from the refresh token, and cached only in this process's memory. Each cache
 * entry is stamped with the row it was minted from (`updated_at` plus a digest
 * of `sealed`) and re-checked against the table on every access, so a
 * disconnect or reconnect on any instance invalidates it. Nothing here is ever
 * returned to the browser: the panel calls our routes, and our routes call the
 * provider.
 *
 * Fail closed: without a valid key, `seal`/`open` throw
 * `EncryptionUnavailableError`, and the connect route refuses before a flow
 * starts. Nothing is ever stored in plaintext.
 *
 * Ported from mlai `src/lib/server/workspace-tokens.ts` (b6f3686), with Cloud
 * KMS envelope encryption replaced by `crypto.server.ts` (spec decision 3).
 */
import { getSql } from "@/lib/db";
import {
  EncryptionUnavailableError,
  SealedDataError,
  digest,
  open,
  seal,
} from "@/lib/server/crypto.server";
import {
  providerCredentials,
  refreshAccessToken,
  revokeGrant,
  type WorkspaceProvider,
} from "./oauth.server";

declare global {
  var __quesarWorkspaceAccessTokens: Map<string, CachedAccessToken> | undefined;
}

interface CachedAccessToken {
  token: string;
  expiresAt: number;
  /** Identity of the row this token was minted from; see `rowStamp`. */
  stamp: string;
}

interface StoredRow {
  sealed: string;
  stamp: string;
}

/**
 * `updated_at` alone can repeat within one millisecond; `sealed` is re-sealed
 * with a fresh IV on every write, so its digest always changes.
 */
function rowStamp(row: { sealed: string; updated_at: unknown }): string {
  return `${iso(row.updated_at)}|${digest(row.sealed)}`;
}

async function readStoredRow(
  userId: string,
  provider: WorkspaceProvider,
): Promise<StoredRow | null> {
  const sql = await getSql();
  const rows = await sql<{ sealed: string; updated_at: unknown }>`
    select sealed, updated_at from workspace_connections
    where user_id = ${userId} and provider = ${provider}`;
  const row = rows[0];
  return row ? { sealed: row.sealed, stamp: rowStamp(row) } : null;
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
  /**
   * The stored token no longer opens (the encryption key changed, or the row
   * was tampered with). The user has to reconnect; the row can still be deleted.
   */
  needsReauth: boolean;
}

/**
 * False only when this row's sealed token provably does not open for this
 * (user, provider) under the current key. With no key at all nothing can be
 * judged; the connections route already reports `encryption_not_configured`.
 */
function opens(sealed: string, userId: string, provider: WorkspaceProvider): boolean {
  try {
    open(sealed, workspaceAad(userId, provider));
    return true;
  } catch (error) {
    if (error instanceof SealedDataError) return false;
    if (error instanceof EncryptionUnavailableError) return true;
    throw error;
  }
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

export async function listWorkspaceConnections(
  userId: string,
): Promise<WorkspaceConnectionSummary[]> {
  const sql = await getSql();
  const rows = await sql<{
    provider: WorkspaceProvider;
    account_email: string | null;
    scope: string | null;
    connected_at: unknown;
    sealed: string;
  }>`
    select provider, account_email, scope, connected_at, sealed
    from workspace_connections
    where user_id = ${userId}
    order by provider`;
  return rows.map((row) => ({
    provider: row.provider,
    accountEmail: row.account_email,
    scope: row.scope,
    connectedAt: iso(row.connected_at),
    needsReauth: !opens(row.sealed, userId, row.provider),
  }));
}

export async function deleteWorkspaceConnection(
  userId: string,
  provider: WorkspaceProvider,
): Promise<boolean> {
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
export async function readRefreshToken(
  userId: string,
  provider: WorkspaceProvider,
): Promise<string | null> {
  const row = await readStoredRow(userId, provider);
  return row ? open(row.sealed, workspaceAad(userId, provider)) : null;
}

function accessTokenCache(): Map<string, CachedAccessToken> {
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
 * stored refresh token when the cached one has expired or no longer matches
 * the stored row.
 *
 * Throws `WorkspaceNotConnectedError` when there is no connection (including
 * one removed while the refresh was in flight) or the provider has no
 * credentials configured, and `SealedDataError` when the stored token no longer
 * opens (the caller reports that as "reconnect required").
 */
export async function getWorkspaceAccessToken(
  userId: string,
  provider: WorkspaceProvider,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const cache = accessTokenCache();
  const key = cacheKey(userId, provider);

  const credentials = providerCredentials(provider);
  if (!credentials) throw new WorkspaceNotConnectedError(provider);

  // Checked on every access: a disconnect or reconnect anywhere changes or
  // removes the row, and the cached token must not outlive it.
  const row = await readStoredRow(userId, provider);
  if (!row) {
    cache.delete(key);
    throw new WorkspaceNotConnectedError(provider);
  }
  const cached = cache.get(key);
  if (cached && cached.stamp === row.stamp && cached.expiresAt > Date.now()) return cached.token;
  cache.delete(key);

  const refreshToken = open(row.sealed, workspaceAad(userId, provider));
  const refreshed = await refreshAccessToken(provider, credentials, refreshToken, fetchImpl);
  const sql = await getSql();

  let stamp: string | null;
  if (refreshed.refreshToken && refreshed.refreshToken !== refreshToken) {
    // Providers that rotate refresh tokens hand back a new one, and the old one
    // stops working once used, so it must be persisted. Compare-and-swap on the
    // envelope we read: a reconnect or disconnect that landed meanwhile wins,
    // and this request's token is then not cached.
    const sealed = seal(refreshed.refreshToken, workspaceAad(userId, provider));
    const updated = await sql<{ sealed: string; updated_at: unknown }>`
      update workspace_connections set sealed = ${sealed}, updated_at = now()
      where user_id = ${userId} and provider = ${provider} and sealed = ${row.sealed}
      returning sealed, updated_at`;
    stamp = updated[0] ? rowStamp(updated[0]) : null;
  } else {
    stamp = row.stamp;
  }

  // Re-read after the refresh: if the row vanished while we were talking to the
  // provider, the user disconnected and nothing may be cached or returned.
  const current = await readStoredRow(userId, provider);
  if (!current) {
    cache.delete(key);
    throw new WorkspaceNotConnectedError(provider);
  }
  if (stamp !== null && current.stamp === stamp) {
    cache.set(key, { token: refreshed.accessToken, expiresAt: refreshed.expiresAt, stamp });
  }
  return refreshed.accessToken;
}
