/**
 * Purge a user's app data before Better Auth deletes the account (wired as
 * `user.deleteUser.beforeDelete` in src/lib/auth/server.ts; Donald authorized
 * that additive edit on 2026-09-22).
 *
 * - Workspace grants are revoked at the provider when possible, then the
 *   sealed refresh tokens are deleted (revocation is best effort; deletion is not).
 * - Per-user rows go: consents, audits (and their access log), field notes,
 *   rate-limit counters.
 * - Contact inquiries and invoices are business records: kept, but unlinked.
 * - Invoice audit actors are unlinked; settlement actors become deleted-account.
 *
 * Throws on a database failure so Better Auth aborts the deletion instead of
 * leaving an account-less remnant of the user's data behind.
 */
import { getSql } from "@/lib/db";

export interface PurgeReport {
  workspace: { provider: string; revoked: boolean }[];
  deleted: Record<string, number>;
  inquiriesUnlinked: number;
}

type RevokeFn = (
  userId: string,
  provider: "google" | "microsoft",
) => Promise<{ removed: boolean; revoked: boolean }>;

async function defaultRevoke(userId: string, provider: "google" | "microsoft") {
  const { revokeAndDeleteWorkspaceConnection } =
    await import("@/lib/workspace-connectors/tokens.server");
  return revokeAndDeleteWorkspaceConnection(userId, provider);
}

export async function purgeUserData(
  userId: string,
  revoke: RevokeFn = defaultRevoke,
): Promise<PurgeReport> {
  const { unlinkCommerceAccount } = await import("./commerce.server");
  await unlinkCommerceAccount(userId);
  const sql = await getSql();
  const connected = await sql<{ provider: "google" | "microsoft" }>`
    select provider from workspace_connections where user_id = ${userId}`;
  const workspace: PurgeReport["workspace"] = [];
  for (const { provider } of connected) {
    const result = await revoke(userId, provider);
    workspace.push({ provider, revoked: result.revoked });
  }

  // One statement is atomic on both pooled PostgreSQL and PGLite. Do not use
  // BEGIN plus pool.query: subsequent queries could use a different connection.
  // Provider revocation/token cleanup above and Better Auth deletion afterwards
  // remain separate steps and cannot be rolled back by this statement.
  const [counts] = await sql<Record<string, number>>`
    with connections as (
      delete from workspace_connections where user_id = ${userId} returning 1
    ), access as (
      delete from audit_access_events where actor_user_id = ${userId}
        or audit_id in (select id from conversation_audits where user_id = ${userId}) returning 1
    ), audits as (
      delete from conversation_audits where user_id = ${userId} returning 1
    ), consents as (
      delete from chat_consents where user_id = ${userId} returning 1
    ), notes as (
      delete from field_notes where user_id = ${userId} returning 1
    ), limits as (
      delete from rate_limits where subject = ${userId} returning 1
    ), inquiries as (
      update inquiries set user_id = null where user_id = ${userId} returning 1
    ) select
      (select count(*)::int from connections) as workspace_connections,
      (select count(*)::int from access) as audit_access_events,
      (select count(*)::int from audits) as conversation_audits,
      (select count(*)::int from consents) as chat_consents,
      (select count(*)::int from notes) as field_notes,
      (select count(*)::int from limits) as rate_limits,
      (select count(*)::int from inquiries) as inquiries_unlinked`;
  const { inquiries_unlinked: inquiriesUnlinked, ...deleted } = counts;
  return { workspace, deleted, inquiriesUnlinked };
}
