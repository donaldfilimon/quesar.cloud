import { AsyncLocalStorage } from "node:async_hooks";
import { getSql } from "../db";

interface Assertion {
  provider: string;
  subject: string;
  email: string;
}
const assertions = new AsyncLocalStorage<{ assertion?: Assertion }>();
export function withOAuthProvenance<T>(run: () => T): T {
  return assertions.run({}, run);
}

/** Called only with a fresh, validated OAuth profile, never a database user. */
export async function observeOAuthAssertion(
  user: { id?: string; email?: string; emailVerified?: boolean },
  source: { method: string; oauth?: { providerId: string; profile?: unknown } },
) {
  const provider = source.oauth?.providerId;
  if (source.method !== "oauth" || (provider !== "google" && provider !== "apple")) return;
  const profile = source.oauth?.profile as { sub?: unknown } | undefined;
  if (typeof profile?.sub !== "string" || !profile.sub || !user.email) return;
  if (user.emailVerified !== true) {
    const store = assertions.getStore();
    if (store) store.assertion = undefined;
    if (user.id) {
      const sql = await getSql();
      await sql`delete from oauth_email_verifications v using "account" a
        where v.account_id = a.id and a."userId" = ${user.id}
        and a."providerId" = ${provider} and a."accountId" = ${profile.sub}`;
    }
    return;
  }
  const assertion = { provider, subject: profile.sub, email: user.email.trim().toLowerCase() };
  const store = assertions.getStore();
  if (store) store.assertion = assertion;
  if (user.id) {
    const sql = await getSql();
    await sql`insert into oauth_email_verifications (account_id, email)
      select "id", ${assertion.email} from "account"
      where "userId" = ${user.id} and "providerId" = ${provider} and "accountId" = ${assertion.subject}
      on conflict (account_id) do update set email = excluded.email, verified_at = now()`;
  }
}

export async function recordCreatedOAuthAccount(account: {
  id: string;
  providerId: string;
  accountId: string;
}) {
  const assertion = assertions.getStore()?.assertion;
  if (
    !assertion ||
    assertion.provider !== account.providerId ||
    assertion.subject !== account.accountId
  )
    return;
  const sql = await getSql();
  await sql`insert into oauth_email_verifications (account_id, email) values (${account.id}, ${assertion.email})
    on conflict (account_id) do update set email = excluded.email, verified_at = now()`;
}
