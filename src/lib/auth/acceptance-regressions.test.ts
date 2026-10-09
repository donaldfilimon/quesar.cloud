import { runWithEndpointContext } from "@better-auth/core/context";
import { afterEach, expect, it, vi } from "vitest";
import { getAuth } from "./server";
import { betterAuth } from "better-auth";
import { getSql } from "../db";
import { adminDecisionFor } from "../server/admin.server";
import { randomUUID } from "node:crypto";
import { withOAuthProvenance } from "./oauth-provenance.server";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("rejects oversized and blank names at the actual Better Auth endpoint", async () => {
  const auth = getAuth();
  for (const name of ["x".repeat(81), "   "]) {
    const response = await auth.handler(
      new Request("http://localhost:8080/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:8080" },
        body: JSON.stringify({
          name,
          email: `${randomUUID()}@example.invalid`,
          password: "synthetic-password-2026",
        }),
      }),
    );
    expect(response.status).toBe(400);
  }
});

it("requires verified Google and Apple email in installed Better Auth linking fixtures", async () => {
  const auth = getAuth();
  const context = await auth.$context;
  const path = new URL(
    "../../../node_modules/better-auth/dist/oauth2/link-account.mjs",
    import.meta.url,
  ).href;
  const { linkOAuthAccount } = await import(path);
  for (const providerId of ["google", "apple"]) {
    const id = randomUUID();
    const email = `${id}@example.invalid`;
    const sql = await getSql();
    await sql`insert into "user" (id, name, email, "emailVerified") values (${id}, 'Synthetic linking fixture', ${email}, false)`;
    const fixture = { context, getHeader: () => null };
    const result = await linkOAuthAccount(fixture, {
      link: { userId: id, email },
      userInfo: { id: `provider-${id}`, name: "Fixture", email, emailVerified: false },
      account: { providerId, accountId: `provider-${id}` },
      profile: {},
      scopes: [],
    });
    expect(result.linked).toBe(false);
    expect(await sql`select id from account where "userId" = ${id}`).toHaveLength(0);
    const verified = await withOAuthProvenance(() =>
      linkOAuthAccount(fixture, {
        link: { userId: id, email },
        userInfo: { id: `provider-${id}`, name: "Fixture", email, emailVerified: true },
        account: { providerId, accountId: `provider-${id}` },
        profile: { sub: `provider-${id}` },
        scopes: [],
      }),
    );
    expect(verified.linked).toBe(true);
    vi.stubEnv("ADMIN_EMAILS", email);
    expect(await adminDecisionFor(id)).toEqual({ admin: true });
  }
});

it("current auth refuses a revoked session including a previously cached signed cookie", async () => {
  const auth = getAuth();
  // Explicit old-config fixture: proves the risk without enabling the cache in
  // the current application or relying on a mocked session resolver.
  const baseline = betterAuth({
    ...(await auth.$context).options,
    session: { cookieCache: { enabled: true, maxAge: 300 } },
  });
  const response = await baseline.handler(
    new Request("http://localhost:8080/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:8080" },
      body: JSON.stringify({
        name: "Synthetic cache probe",
        email: `${randomUUID()}@example.invalid`,
        password: "synthetic-password-2026",
      }),
    }),
  );
  expect(response.status).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const headers = new Headers({ cookie });
  const session = await auth.api.getSession({ headers });
  expect(session).toBeTruthy();
  const sql = await getSql();
  await sql`delete from session where "userId" = ${session!.user.id}`;
  expect(await baseline.api.getSession({ headers })).toBeTruthy();
  expect(await auth.api.getSession({ headers })).toBeNull();
  expect(await auth.api.getSession({ headers, query: { disableCookieCache: true } })).toBeNull();
  const update = await auth.handler(
    new Request("http://localhost:8080/api/auth/update-user", {
      method: "POST",
      headers: { cookie, "content-type": "application/json", origin: "http://localhost:8080" },
      body: JSON.stringify({ name: "Must refuse revoked session" }),
    }),
  );
  expect(update.status).toBe(401);
  const keyId = randomUUID();
  await sql`insert into passkey (id,"publicKey","userId","credentialID",counter,"deviceType","backedUp") values (${keyId},'synthetic-key',${session!.user.id},${keyId},0,'singleDevice',false)`;
  const removeKey = await auth.handler(
    new Request("http://localhost:8080/api/auth/passkey/delete-passkey", {
      method: "POST",
      headers: { cookie, "content-type": "application/json", origin: "http://localhost:8080" },
      body: JSON.stringify({ id: keyId }),
    }),
  );
  expect(removeKey.status).toBe(401);
  expect(await sql`select id from passkey where id=${keyId}`).toHaveLength(1);
});

it("rejects unverified provider identities during actual OAuth fixture provisioning", async () => {
  const context = await getAuth().$context;
  const path = new URL(
    "../../../node_modules/better-auth/dist/oauth2/link-account.mjs",
    import.meta.url,
  ).href;
  const { handleOAuthUserInfo: handle } = await import(path);
  const handleOAuthUserInfo = (
    fixture: { context: typeof context; getHeader: () => null },
    options: unknown,
  ) =>
    // Better Auth's endpoint context erases the concrete app adapter options.
    withOAuthProvenance(() =>
      runWithEndpointContext(
        fixture as unknown as Parameters<typeof runWithEndpointContext>[0],
        () => handle(fixture, options),
      ),
    );
  for (const providerId of ["google", "apple"]) {
    const id = randomUUID();
    const email = `${id}@example.invalid`;
    const result = await handleOAuthUserInfo(
      { context, getHeader: () => null },
      {
        userInfo: { id, name: "Synthetic Provider", email, emailVerified: false },
        account: { providerId, accountId: id },
        callbackURL: "/",
        deferNonDatabaseWrites: true,
      },
    ).then(
      () => "accepted",
      (error: { body?: { code: string } }) => error.body?.code,
    );
    expect(result).toBe("provider_email_unverified");
    const sql = await getSql();
    expect(await sql`select id from "user" where email=${email}`).toHaveLength(0);
    const verified = await handleOAuthUserInfo(
      { context, getHeader: () => null },
      {
        userInfo: { id, name: "Synthetic Provider", email, emailVerified: true },
        source: { method: "oauth", oauth: { providerId, profile: { sub: id } } },
        account: { providerId, accountId: id },
        callbackURL: "/",
        deferNonDatabaseWrites: true,
      },
    );
    expect(Boolean(verified.data?.user?.id)).toBe(true);
    vi.stubEnv("ADMIN_EMAILS", email);
    expect(await adminDecisionFor(verified.data.user.id)).toEqual({ admin: true });
    const returning = await handleOAuthUserInfo(
      { context, getHeader: () => null },
      {
        userInfo: { id, name: "Synthetic Provider", email, emailVerified: false },
        account: { providerId, accountId: id },
        callbackURL: "/",
        deferNonDatabaseWrites: true,
      },
    ).then(
      () => "accepted",
      (error: { body?: { code: string } }) => error.body?.code,
    );
    expect(returning).toBe("provider_email_unverified");
  }
});

it("records the legacy provider-row remediation boundary for password sessions", async () => {
  // Historical fixture only: existing provider rows have no durable verified-claim
  // provenance. The new OAuth gate cannot revalidate a password sign-in.
  const auth = getAuth();
  const email = `${randomUUID()}@example.invalid`;
  const password = "synthetic-legacy-probe-password";
  const signup = await auth.handler(
    new Request("http://localhost:8080/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:8080" },
      body: JSON.stringify({ email, password, name: "Historical fixture" }),
    }),
  );
  expect(signup.status).toBe(200);
  const sql = await getSql();
  const [user] = await sql<{ id: string }>`select id from "user" where email=${email}`;
  await sql`insert into account (id,"accountId","providerId","userId","updatedAt") values (${randomUUID()},${randomUUID()},'google',${user.id},now())`;
  const signin = await auth.handler(
    new Request("http://localhost:8080/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:8080" },
      body: JSON.stringify({ email, password }),
    }),
  );
  expect(signin.status).toBe(200);
  const cookie = signin.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
    query: { disableCookieCache: true },
  });
  expect(session?.user.id).toBe(user.id);
  vi.stubEnv("ADMIN_EMAILS", email);
  expect(await adminDecisionFor(user.id)).toEqual({ admin: false, reason: "unverified_identity" });
});
