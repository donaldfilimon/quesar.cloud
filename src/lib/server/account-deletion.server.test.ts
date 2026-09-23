import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { getSql } from "@/lib/db";
import { purgeUserData } from "./account-deletion.server";

async function seed(userId: string) {
  const sql = await getSql();
  const auditId = randomUUID();
  await sql`insert into field_notes (user_id, node_id, body) values (${userId}, 'quesar', 'note')`;
  await sql`insert into chat_consents (user_id, policy_version, consented_at) values (${userId}, 'v', now())`;
  await sql`insert into conversation_audits (id, user_id, provider, model, policy_version, sealed, content_digest, expires_at)
    values (${auditId}, ${userId}, 'xai', 'm', 'v', 'v1.x.y.z', 'd', now() + interval '1 day')`;
  await sql`insert into audit_access_events (audit_id, actor_user_id, actor_type, action, outcome)
    values (${auditId}, ${userId}, 'user', 'read', 'succeeded')`;
  await sql`insert into workspace_connections (user_id, provider, sealed) values (${userId}, 'google', 'v1.x.y.z')`;
  await sql`insert into rate_limits (bucket, subject, window_start, count) values ('llm', ${userId}, now(), 1)`;
  await sql`insert into inquiries (user_id, name, email, message) values (${userId}, 'n', 'e@example.com', 'hello there')`;
  return auditId;
}

async function rowsFor(userId: string) {
  const sql = await getSql();
  const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0].n);
  return {
    notes: await one(sql`select count(*)::int as n from field_notes where user_id = ${userId}`),
    consents: await one(
      sql`select count(*)::int as n from chat_consents where user_id = ${userId}`,
    ),
    audits: await one(
      sql`select count(*)::int as n from conversation_audits where user_id = ${userId}`,
    ),
    access: await one(
      sql`select count(*)::int as n from audit_access_events where actor_user_id = ${userId}`,
    ),
    connections: await one(
      sql`select count(*)::int as n from workspace_connections where user_id = ${userId}`,
    ),
    limits: await one(sql`select count(*)::int as n from rate_limits where subject = ${userId}`),
    inquiries: await one(sql`select count(*)::int as n from inquiries where user_id = ${userId}`),
  };
}

describe("purgeUserData", () => {
  it("removes every per-user row, keeps other users' data, and unlinks inquiries", async () => {
    const victim = `user-${randomUUID()}`;
    const bystander = `user-${randomUUID()}`;
    await seed(victim);
    await seed(bystander);
    const revoke = vi.fn(async (userId: string) => {
      const sql = await getSql();
      await sql`delete from workspace_connections where user_id = ${userId}`;
      return { removed: true, revoked: true };
    });

    const report = await purgeUserData(victim, revoke);

    expect(revoke).toHaveBeenCalledWith(victim, "google");
    expect(report.workspace).toEqual([{ provider: "google", revoked: true }]);
    expect(report.inquiriesUnlinked).toBe(1);
    expect(await rowsFor(victim)).toEqual({
      notes: 0,
      consents: 0,
      audits: 0,
      access: 0,
      connections: 0,
      limits: 0,
      inquiries: 0,
    });
    expect(await rowsFor(bystander)).toEqual({
      notes: 1,
      consents: 1,
      audits: 1,
      access: 1,
      connections: 1,
      limits: 1,
      inquiries: 1,
    });
    const sql = await getSql();
    const kept = await sql<{
      n: number;
    }>`select count(*)::int as n from inquiries where user_id is null and email = 'e@example.com'`;
    expect(Number(kept[0].n)).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it("still deletes the sealed token when the provider revoke fails", async () => {
    const userId = `user-${randomUUID()}`;
    await seed(userId);
    const report = await purgeUserData(userId, async () => ({ removed: false, revoked: false }));
    expect(report.workspace).toEqual([{ provider: "google", revoked: false }]);
    expect((await rowsFor(userId)).connections).toBe(0);
  }, 30_000);
});
