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
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { env } from "../env.server";
import { staticSite } from "../static-site";
import { emailAndPasswordEnabled } from "./email-password";
import { authEnabledOnServer, socialCredentials } from "./methods.server";
import { pgliteDialect } from "./pglite-dialect";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
// Not in the static build: it has no database (see src/lib/db.ts).
if (!staticSite) void ensureDbReady();

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

// Local `npm run dev` (port 8080). Browsers may send Origin as any of these for
// the same server; trusting only `localhost` rejects `127.0.0.1` and breaks
// email/password with "Invalid origin".
const LOCAL_DEV_ORIGINS: string[] = ["http://localhost:8080", "http://127.0.0.1:8080", "http://[::1]:8080"];

// The public origin. Deployed builds set BETTER_AUTH_URL; local dev falls back
// to a dynamic baseURL restricted to the loopback hosts.
const explicitBaseURL = env("BETTER_AUTH_URL")?.replace(/\/+$/, "");
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
export const SESSION_TOKEN_COOKIE = "__Host-quesar.session_token";

export const auth = betterAuth({
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
      trustedProviders: ["google", "apple"],
    },
  },

  // Cache the session in the short-lived signed `session_data` cookie so reads
  // (incl. the client's `/get-session`) skip the database.
  session: { cookieCache: { enabled: true, maxAge: 300 } },

  // Account deletion. Additive edit authorized by Donald on 2026-09-22 (see
  // AGENTS.md). Purge per-user app data first; a DB failure there
  // throws, so Better Auth aborts rather than leaving orphaned data behind.
  user: {
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
