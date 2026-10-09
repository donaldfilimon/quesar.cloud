import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { getSql } from "../db";
import {
  observeOAuthAssertion,
  recordCreatedOAuthAccount,
  withOAuthProvenance,
} from "./oauth-provenance.server";

it("migration leaves legacy links unknown; fresh exact-subject assertions reverify without changing users", async () => {
  const sql = await getSql();
  const id = randomUUID();
  const accountId = randomUUID();
  const subject = randomUUID();
  await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values (${id}, 'Test', ${`${id}@example.com`}, false, now(), now())`;
  await sql`insert into "account" (id, "userId", "accountId", "providerId", "createdAt", "updatedAt") values (${accountId}, ${id}, ${subject}, 'google', now(), now())`;
  const evidence = () =>
    sql<{
      email: string;
    }>`select email from oauth_email_verifications where account_id = ${accountId}`;
  try {
    expect(await evidence()).toEqual([]);
    const user = { id, email: `${id}@example.com`, emailVerified: true };
    await observeOAuthAssertion(user, {
      method: "oauth",
      oauth: { providerId: "google", profile: { sub: "different-subject" } },
    });
    expect(await evidence()).toEqual([]);
    await observeOAuthAssertion(
      { ...user, emailVerified: false },
      { method: "oauth", oauth: { providerId: "google", profile: { sub: subject } } },
    );
    expect(await evidence()).toEqual([]);
    await observeOAuthAssertion(user, {
      method: "oauth",
      oauth: { providerId: "google", profile: { sub: subject } },
    });
    expect(await evidence()).toEqual([{ email: user.email }]);
    await observeOAuthAssertion(user, {
      method: "oauth",
      oauth: { providerId: "google", profile: { sub: subject } },
    });
    expect(await evidence()).toHaveLength(1);
    await observeOAuthAssertion(
      { ...user, emailVerified: false },
      { method: "oauth", oauth: { providerId: "google", profile: { sub: subject } } },
    );
    expect(await evidence()).toEqual([]);
    await observeOAuthAssertion(user, {
      method: "oauth",
      oauth: { providerId: "google", profile: { sub: subject } },
    });
    const rows = await sql<{
      emailVerified: boolean;
    }>`select "emailVerified" from "user" where id = ${id}`;
    expect(rows[0].emailVerified).toBe(false);
    await sql`delete from "account" where id = ${accountId}`;
    expect(await evidence()).toEqual([]);
  } finally {
    await sql`delete from "user" where id = ${id}`;
  }
});

it("request-local assertion cannot label a different created account", async () => {
  await withOAuthProvenance(async () => {
    await observeOAuthAssertion(
      { email: "verified@example.com", emailVerified: true },
      { method: "oauth", oauth: { providerId: "google", profile: { sub: "verified-subject" } } },
    );
    // Nonexistent FK would fail if mismatched evidence were manufactured.
    await expect(
      recordCreatedOAuthAccount({ id: randomUUID(), accountId: "other", providerId: "google" }),
    ).resolves.toBeUndefined();
  });
  await expect(
    recordCreatedOAuthAccount({
      id: randomUUID(),
      accountId: "verified-subject",
      providerId: "google",
    }),
  ).resolves.toBeUndefined();
});
