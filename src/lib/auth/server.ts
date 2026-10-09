/**
 * This app's own Better Auth (server-only), mounted at `/api/auth/*`.
 *
 * Sign-in methods, all first-party (no broker):
 *   - email and password;
 *   - passkeys (WebAuthn, `@better-auth/passkey`);
 *   - Google, Apple and X, each offered only when its credentials are set
 *     (`methods.server.ts`), so the sign-in page never shows a dead button.
 *
 * Sessions live in the same database as app data: Neon/pg when `DATABASE_URL`
 * is set, else the embedded PGLite (data lost on restart). Auth is on unless
 * `VITE_AUTH_ENABLED` is "false" (only the static Pages build sets that).
 *
 * NEVER import this from client code: it pulls in `pg` and server-only Better
 * Auth internals. The client uses `@/lib/auth/client`; components read the user
 * via `@/lib/auth/use-current-user`; server functions get a verified id via
 * `@/lib/auth/middleware`.
 */
import { passkey } from "@better-auth/passkey";
import { betterAuth, APIError } from "better-auth";
import { validateDisplayName } from "../profile-name";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { getPglite } from "../db";
import { env } from "../env.server";
import { emailAndPasswordEnabled } from "./email-password";
import { authEnabledOnServer, socialCredentials } from "./methods.server";
import { runtimeReadiness } from "../server/readiness.server";
import { pgliteDialect } from "./pglite-dialect";
import { observeOAuthAssertion, recordCreatedOAuthAccount } from "./oauth-provenance.server";

/**
 * Local-dev secret that outlives module reloads: PGLite (and its session rows)
 * lives on `globalThis`, so an HMR re-eval must not mint a new signing secret
 * and invalidate every session. Deployed builds must set BETTER_AUTH_SECRET.
 */
const globalAuthRef = globalThis as typeof globalThis & { __quesarDevAuthSecret__?: string };
function devAuthSecret(): string {
  globalAuthRef.__quesarDevAuthSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__quesarDevAuthSecret__;
}

/** True when sign-in is enforced (everywhere except the static build). */
export const authConfigured = authEnabledOnServer();

// Local `bun run dev` (port 8080). Browsers may send Origin as any of these for
// the same server; trusting only `localhost` rejects `127.0.0.1` and breaks
// email/password with "Invalid origin".
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

function createAuth() {
  // The public origin. Deployed builds set BETTER_AUTH_URL; local dev falls back
  // to a dynamic baseURL restricted to the loopback hosts.
  const configuredBaseURL = env("BETTER_AUTH_URL")?.replace(/\/+$/, "");
  // Invalid runtime config is rejected by request middleware. Module evaluation
  // must still be safe during a credential-free build/prerender.
  const explicitBaseURL = (() => {
    try {
      return configuredBaseURL ? new URL(configuredBaseURL).origin : undefined;
    } catch {
      return undefined;
    }
  })();
  const baseURL = explicitBaseURL ?? {
    allowedHosts: ["localhost", "127.0.0.1", "[::1]"],
    protocol: "auto" as const,
    fallback: "http://localhost:8080",
  };

  const social = authConfigured ? socialCredentials() : {};

  // Origins Better Auth accepts on credentialed POSTs. Apple completes sign-in
  // with a cross-site form POST to the callback, so its origin must be trusted.
  const trustedOrigins: string[] = [
    ...(explicitBaseURL ? [explicitBaseURL] : []),
    ...LOCAL_DEV_ORIGINS,
    ...(social.apple ? ["https://appleid.apple.com"] : []),
  ];

  // WebAuthn binds a passkey to the relying party's host name.
  const passkeyRpID = explicitBaseURL ? new URL(explicitBaseURL).hostname : "localhost";
  const passkeyOrigin = explicitBaseURL ? [explicitBaseURL] : LOCAL_DEV_ORIGINS;

  const databaseUrl = env("DATABASE_URL");

  // Real Postgres when `DATABASE_URL` is set, else the embedded PGLite through a
  // Kysely dialect, so Better Auth persists to the SAME database as app data.
  // The schema is `migrations/0001_auth.sql` plus `0008_passkeys.sql`.
  const database = databaseUrl
    ? new Pool({ connectionString: databaseUrl })
    : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

  /** Session token cookie name. */
  const SESSION_TOKEN_COOKIE = "__Host-quesar.session_token";

  return betterAuth({
    baseURL,
    secret: env("BETTER_AUTH_SECRET") ?? devAuthSecret(),
    database,
    trustedOrigins,

    socialProviders: {
      ...(social.google ? { google: { ...social.google, prompt: "select_account" as const } } : {}),
      ...(social.apple ? { apple: social.apple } : {}),
      ...(social.twitter ? { twitter: social.twitter } : {}),
    },

    // Encrypt provider OAuth tokens at rest. Linking a social identity to an
    // existing user by email is allowed only for providers that verify the
    // address (Google, Apple); X may return no email or an unverified one.
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        // Require the actual provider assertion; trusting a provider by name
        // bypasses Better Auth's emailVerified check.
        trustedProviders: [],
      },
    },

    // Native auth/plugin endpoints also use sessionMiddleware. A signed cookie
    // cache can otherwise authorize profile writes after database revocation.
    // Keep the database authoritative for every session read.
    session: { cookieCache: { enabled: false } },

    databaseHooks: {
      account: { create: { after: recordCreatedOAuthAccount } },
      user: {
        create: {
          before: async (user) => {
            const checked = validateDisplayName(user.name);
            if (!checked.ok) throw new APIError("BAD_REQUEST", { message: checked.error });
            return { data: { ...user, name: checked.name } };
          },
        },
        update: {
          before: async (user) => {
            if (user.name === undefined) return;
            const checked = validateDisplayName(user.name);
            if (!checked.ok) throw new APIError("BAD_REQUEST", { message: checked.error });
            return { data: { ...user, name: checked.name } };
          },
        },
      },
    },

    // Account deletion. Additive edit authorized by Donald on 2026-09-22 (see
    // AGENTS.md). Purge per-user app data first; a DB failure there
    // throws, so Better Auth aborts rather than leaving orphaned data behind.
    user: {
      // Provider names alone do not prove control of an email. Apply the
      // assertion gate to provisioning, linking and returning OAuth sign-ins.
      validateUserInfo: async ({ user, source }) => {
        await observeOAuthAssertion(user, source);
        if (
          source.method === "oauth" &&
          (source.oauth?.providerId === "google" || source.oauth?.providerId === "apple") &&
          user.emailVerified !== true
        ) {
          return {
            error: "provider_email_unverified",
            errorDescription: "A verified provider email is required.",
          };
        }
      },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          const { purgeUserData } = await import("../server/account-deletion.server");
          await purgeUserData(user.id);
        },
      },
    },

    // Local email/password, toggled in `./email-password`.
    ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

    // `__Host-` cookies: the browser refuses any same-named cookie that carries a
    // `Domain` attribute, so no sibling subdomain can plant a session cookie here.
    // `__Host-` requires Secure + Path=/ + no Domain; Better Auth otherwise uses
    // `__Secure-` (which permits Domain), so its auto prefix is off and the names
    // are set here. Browsers allow Secure cookies on http://localhost.
    advanced: {
      useSecureCookies: false,
      defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
      cookies: {
        session_token: { name: SESSION_TOKEN_COOKIE },
        session_data: { name: "__Host-quesar.session_data" },
        account_data: { name: "__Host-quesar.account_data" },
        dont_remember: { name: "__Host-quesar.dont_remember" },
      },
    },

    plugins: [
      passkey({ rpID: passkeyRpID, rpName: "Quesar", origin: passkeyOrigin }),
      // Bridges Better Auth's Set-Cookie into TanStack Start responses. MUST be
      // last so it runs after every other plugin's hooks.
      tanstackStartCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;
/** Importing this module never constructs Better Auth or opens its database.
 * Revalidate before construction, including calls outside Start middleware.
 */
export function getAuth(): Auth {
  if (!runtimeReadiness().ready) throw new Error("Runtime configuration is not ready");
  instance ??= createAuth();
  return instance;
}
