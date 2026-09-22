/**
 * Purge a user's app data before Better Auth deletes the account (wired as
 * `user.deleteUser.beforeDelete` in src/lib/auth/server.ts; Donald authorized
 * that additive edit on 2026-09-22).
 *
 * - Workspace grants are revoked at the provider when possible, then the
 *   sealed refresh tokens are deleted (revocation is best effort; deletion is not).
 * - Per-user rows go: consents, audits (and their access log), field notes,
 *   rate-limit counters.
 * - Contact inquiries are business records: kept, but unlinked (user_id NULL).
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

type RevokeFn = (userId: string, provider: "google" | "microsoft") => Promise<{ removed: boolean; revoked: boolean }>;

async function defaultRevoke(userId: string, provider: "google" | "microsoft") {
  const { revokeAndDeleteWorkspaceConnection } = await import("@/lib/workspace-connectors/tokens.server");
  return revokeAndDeleteWorkspaceConnection(userId, provider);
}

export async function purgeUserData(userId: string, revoke: RevokeFn = defaultRevoke): Promise<PurgeReport> {
  const sql = await getSql();
  const connected = await sql<{ provider: "google" | "microsoft" }>`
    select provider from workspace_connections where user_id = ${userId}`;
  const workspace: PurgeReport["workspace"] = [];
  for (const { provider } of connected) {
    const result = await revoke(userId, provider);
    workspace.push({ provider, revoked: result.revoked });
  }

  const count = (rows: unknown[]) => rows.length;
  const deleted: Record<string, number> = {};
  deleted.workspace_connections = count(
    await sql`delete from workspace_connections where user_id = ${userId} returning 1`,
  );
  deleted.audit_access_events = count(
    await sql`delete from audit_access_events
      where actor_user_id = ${userId}
         or audit_id in (select id from conversation_audits where user_id = ${userId})
      returning 1`,
  );
  deleted.conversation_audits = count(await sql`delete from conversation_audits where user_id = ${userId} returning 1`);
  deleted.chat_consents = count(await sql`delete from chat_consents where user_id = ${userId} returning 1`);
  deleted.field_notes = count(await sql`delete from field_notes where user_id = ${userId} returning 1`);
  deleted.rate_limits = count(await sql`delete from rate_limits where subject = ${userId} returning 1`);
  const inquiriesUnlinked = count(
    await sql`update inquiries set user_id = null where user_id = ${userId} returning 1`,
  );
  return { workspace, deleted, inquiriesUnlinked };
}
