# Rust server M2: authentication

Parent plan: `notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md` (milestone M2; see "Auth in Rust", "Data layer", "Decisions left with Donald"). M1 is done or nearly done: `quesar-db` (pool, `migrate`, `test_support::TestDatabase`), `quesar-services` (`crypto::SealingKeys`, `rate_limit::{RateLimiter, Bucket, client_ip, resolve_secret}`), and `quesar-server` (`config`, `readiness`, `router`, `static_site`, `csp`, `body_limit`). M2 replaces Better Auth with a Rust implementation: email/password, DB-backed sessions, Google/Apple/X OAuth, passkeys, the admin rule and account deletion, served under `/api/auth/*`. The frontend does not change in M2. The Node server keeps owning `/api/auth/*` on :8080 until M7 points the client at the contract in the API reference below, and its vitest suite must stay green until M8 deletes it.

## Global Constraints

- **The TypeScript file named in each task is the behavioural spec.** Port its behaviour, formats, constants, bucket names and error cases exactly. Where this plan and the TypeScript disagree on a value, the TypeScript wins; say so in the report. Where this plan *deliberately* departs from the TypeScript (listed in "Where the code contradicts the brief"), follow the plan and cite the item.
- Work only under `server/`, `scripts/`, `package.json`, `.gitignore`, and the files a task names. Do not change `src/`, `app/`, `docs/`, existing `migrations/*.sql`, or any TypeScript server code: the Node server stays a working parity oracle. Exceptions: the new `migrations/0010_rust_auth.sql` (Task 1), and `scripts/gen-apple-secret-vectors.ts` plus `server/contract/apple-secret-vectors.json` (Task 7).
- Rust: edition 2024, `unsafe` forbidden, `cargo fmt` clean, `cargo clippy --all-targets -- -D warnings` clean (the workspace denies `clippy::all`). No `unwrap`/`expect`/`panic!` outside tests and `main`'s startup path. Errors are typed enums implementing `std::error::Error`, not strings.
- Crates live in `server/crates/<name>/` and inherit `edition`, `rust-version`, `publish` and `[lints]` from the workspace, as `server/crates/quesar-server/Cargo.toml` does.
- Database access is `sqlx` 0.8 with features `postgres`, `runtime-tokio`, `tls-rustls-ring-webpki` and runtime-checked queries (`sqlx::query`, never the `query!` macros), so builds need no database. `quesar-auth` adds the `time` feature for `timestamptz` columns.
- Secrets never appear in logs, error messages or `Debug` output.
- Tests that need Postgres read `TEST_DATABASE_URL`. If it is unset they **fail** with a message naming `scripts/dev-postgres.sh`; they never skip silently. Tests that need no database must not require one.
- `bun run check:server` must pass at the end of every task, run from the repo root. `bun run test` (vitest) must also stay green: it applies every `migrations/*.sql` to PGLite. `check:server` runs cargo with `--locked`, so commit `server/Cargo.lock` whenever you add a dependency.
- Commit messages: conventional commits (`feat(server): ...`), ending with the two trailer lines the dispatch gives you.

Auth-specific additions:

- No password, session token, OAuth `code`/`state`/PKCE verifier/nonce, ID token, binding cookie, Apple key or client secret in logs, errors or `Debug`. Wrap each in a newtype whose `Debug` prints `[redacted]` and that zeroizes on drop. The request trace must log the path only, never the query string (Task 4).
- Secrets are compared in constant time (`subtle::ConstantTimeEq`): the binding-cookie hash and anything else compared in memory. Tokens and state are looked up by the SHA-256 of a 256-bit random value. An index lookup of that kind leaks nothing useful, so it needs no constant-time compare; say this in a code comment where the lookup happens.
- Every `/api/auth/*` endpoint is rate-limited (Task 4's buckets) before it touches a password or a provider.
- No error response says whether an email is registered. Sign-in failures for an unknown email, an account with no password and a wrong password are identical in status, body and work done (one argon2 verification). Sign-up is the single exception, recorded under Risks.
- Every random value comes from the operating-system RNG (`rand::rngs::OsRng` / `getrandom`).
- HTTP clients that call identity providers do not follow redirects (Better Auth uses `fetchRefusingRedirects` for JWKS) and time out after 10 s. Test clients call `.no_proxy()`, because the cloud container sets `HTTPS_PROXY`/`HTTP_PROXY`.
- Tests never call real providers. Provider endpoints (authorize, token, JWKS, userinfo) are fields of the config struct, with the production URLs as defaults. Tests point them at an in-process mock IdP. There is no environment-variable override for them.
- Time is injected: the auth core takes a `Clock` (production: system time; tests: a settable fake), and every expiry comparison binds the clock's "now". Never sleep in tests.

## Schema decision

**Decision: add new tables `auth_sessions`, `auth_passkeys` and `auth_flows`. Leave Better Auth's `session`, `verification` and `passkey` untouched until M8 drops them.** Altering the existing tables in place would break the Node side. The evidence:

- `vitest` applies every top-level `migrations/*.sql` to PGLite (`src/lib/db.ts:124-129`, the non-recursive `import.meta.glob`), so a 0010 that changed those tables would run under the Node suite.
- `src/lib/auth/email-password.test.ts` and `acceptance-regressions.test.ts` drive the real Better Auth handler over that schema. They sign up, sign in and resolve sessions, which reads `session."token"`. `acceptance-regressions.test.ts:99` runs `delete from session where "userId" = …` and `:121` inserts into `passkey` (`"publicKey"`, `"credentialID"`, `counter`, `"deviceType"`, `"backedUp"`). Better Auth 1.7.19 keeps OAuth state and passkey challenges in `verification` (`better-auth/dist/state.mjs`, `@better-auth/passkey/dist/index.mjs:419`).
- Replacing `session.token` with `token_hash`, recreating `passkey`, or dropping `verification` therefore fails those tests and the Node dev server.

Shared tables stay shared. Rust writes `"user"` and `"account"` with Better Auth's column conventions:

- quoted camelCase columns;
- `"account"."updatedAt"` has no default, so every insert sets it;
- email/password accounts get `"providerId" = 'credential'`, `"accountId" = "user".id` and the hash in `"password"`;
- OAuth accounts use the provider ids `google`, `apple` and `twitter`.

`getProfile` (`src/lib/profile.ts:74-81`), `providerLabel` and `decideAdmin` match on those values. `oauth_email_verifications` is reused as is.

The two servers never share a database: Node uses PGLite in tests, Rust uses Postgres, and there are no production users. The fact that Rust's argon2 hashes are unreadable to Better Auth's scrypt therefore does not matter.

`migrations/0010_rust_auth.sql` (PGLite-compatible: no extensions, no `gen_random_uuid`):

```sql
create table if not exists auth_sessions (
  id          text primary key,
  user_id     text not null references "user" ("id") on delete cascade,
  token_hash  bytea not null unique,            -- SHA-256 of the cookie token
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  expires_at  timestamptz not null,
  ip_address  text,
  user_agent  text
);
create index if not exists auth_sessions_user_id_idx on auth_sessions (user_id);
create index if not exists auth_sessions_expires_at_idx on auth_sessions (expires_at);

create table if not exists auth_passkeys (
  id            text primary key,
  user_id       text not null references "user" ("id") on delete cascade,
  user_handle   uuid not null,                  -- WebAuthn user.id, one per user
  credential_id bytea not null unique,
  credential    jsonb not null,                 -- serialized webauthn_rs Passkey
  name          text,
  device_type   text not null check (device_type in ('singleDevice', 'multiDevice')),
  backed_up     boolean not null,
  created_at    timestamptz not null,
  last_used_at  timestamptz
);
create index if not exists auth_passkeys_user_id_idx on auth_passkeys (user_id);

create table if not exists auth_flows (
  id           text primary key,
  kind         text not null check (kind in ('oauth', 'passkey_register', 'passkey_authenticate')),
  provider     text,                            -- oauth only
  state_hash   bytea unique,                    -- oauth: SHA-256(state)
  binding_hash bytea,                           -- oauth: SHA-256(binding cookie)
  user_id      text references "user" ("id") on delete cascade,  -- passkey_register
  payload      jsonb not null,                  -- PKCE verifier, nonce, return paths, or WebAuthn state
  created_at   timestamptz not null,
  expires_at   timestamptz not null
);
create index if not exists auth_flows_expires_at_idx on auth_flows (expires_at);
```

M8 adds a migration that drops `session`, `verification` and `passkey`.

## Where the code contradicts the brief

1. **Dev cookies.** The TypeScript never drops `__Host-`/`Secure` in development. `server.ts:183-196` sets `secure: true, sameSite: "lax", path: "/"` with the `__Host-` names, and notes "Browsers allow Secure cookies on http://localhost". Port that rule: identical cookie attributes in every mode. Development works because Chrome and Firefox accept Secure cookies on `http://localhost`.
2. **X linking.** Better Auth links any provider whose user info has `emailVerified: true` (`link-account.mjs`, `handleOAuthUserInfo`), and X sets it when `confirmed_email` comes back (`social-providers/twitter.mjs:62-69`). So today X *can* link by email. The brief says X never links. Follow the brief: it is stricter and matches the stated intent in `server.ts:113-115`.
3. **Linking also requires the local user to be verified.** `requireLocalEmailVerified` defaults to true, so an email/password user (always `emailVerified = false`) is never joined by a later Google or Apple sign-in; that sign-in gets `account_not_linked`. Port this.
4. **Same-origin rule.** `csrf.ts:21` compares `Origin` to `new URL(request.url).origin`, which comes from `Host`. Rust compares it to the configured origin, as the parent plan says. This is deliberate.
5. **Trusted origins in production.** `server.ts:79-83` trusts `LOCAL_DEV_ORIGINS` even when `BETTER_AUTH_URL` is set. Rust trusts the dev origins only outside production.
6. **Sessions by token.** `sessions-card.tsx` revokes by `session.token`, which Better Auth returns to the browser. Rust never returns a token; it revokes by session id. M7 changes the call site.
7. **OAuth state also has a cookie in the TypeScript.** Better Auth stores state in the DB *and* checks a signed `state` cookie (`state.mjs`, strategy "database", lines 77-84). It also turns Apple's cross-site form POST into a GET redirect so the Lax cookie arrives (`api/routes/callback.mjs:35-45`). Port both: the DB row holds the state, and a binding cookie stops login CSRF.
8. **Provider tokens.** Better Auth stores encrypted OAuth access/refresh/ID tokens (`encryptOAuthTokens: true`). Nothing in `src/` reads them. Rust stores none.
9. **Passkey user verification.** Better Auth uses `userVerification: "preferred"`; `webauthn-rs` passkeys require it. Accept the stricter behaviour.
10. **Rate limits.** Better Auth's own limiter (production only, in memory) allows 3 requests per 10 s on `/sign-in*` and `/sign-up*` and 100 per 10 s elsewhere (`api/rate-limiter/index.mjs:305-318`, `context/create-context.mjs:172-174`). The new buckets port those numbers.

## Task 1: `quesar-auth` crate, migration 0010, row types and primitives

**Spec source:** `migrations/0001_auth.sql`, `0008_passkeys.sql`, `0009_oauth_verification.sql`; `src/lib/auth/server.ts:56-99` (origin, trusted origins, RP ID); `src/lib/auth/methods.server.ts` (credential env vars); `src/lib/server/config.server.ts:63-71` (`adminEmails`).

- Add `migrations/0010_rust_auth.sql` exactly as in "Schema decision".
- Create `server/crates/quesar-auth`. It is framework-free: no axum, so the core is testable with only a database.
  - `ids.rs`: `new_id()`, 32 characters from `[A-Za-z0-9]` (Better Auth's `generateId` shape).
  - `token.rs`: `SecretToken` (32 random bytes, base64url without padding; redacted `Debug`; zeroized) and `token_hash(&str) -> [u8; 32]` (SHA-256).
  - `clock.rs`: the `Clock` trait, `SystemClock` and `FixedClock`.
  - `rows.rs`: `UserRow`, `AccountRow`, `SessionRow`, `PasskeyRow` and `FlowRow`.
  - `error.rs`.
- `config.rs` builds `AuthConfig::from_lookup(impl Fn(&str) -> Option<String>, production: bool)`. Blank values read as unset.
  - **Public origin:** `PUBLIC_ORIGIN`, else `BETTER_AUTH_URL`. Strip trailing slashes and reduce to the URL's origin. An unparsable value counts as unset (`server.ts:59-68`).
  - **Trusted origins:** the public origin, plus `http://localhost:8080`, `http://127.0.0.1:8080` and `http://[::1]:8080` when not in production.
  - **WebAuthn:** the RP ID is the public origin's hostname, else `localhost`. The RP origins are the public origin, else the three dev origins. The RP name is `Quesar` (`server.ts:85-87,200`).
  - **Providers:**
    - Google: `GOOGLE_SIGNIN_CLIENT_ID`/`_SECRET`, each falling back to `GOOGLE_OAUTH_*` *independently*, as `methods.server.ts:25-27` does.
    - Apple: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, all four required.
    - X: `TWITTER_CLIENT_ID`/`_SECRET`.
    - Each provider holds its `ProviderEndpoints` with production defaults.
  - **Admin allowlist:** `ADMIN_EMAILS` split on `[\s,]+`, trimmed, lowercased, empties dropped.
  - Client secrets are redacted newtypes.
- In `quesar-services::rate_limit`, add `Bucket::AuthCredential` (`"auth"`, 10 000 ms, max 3) and `Bucket::AuthGeneral` (`"auth-general"`, 10 000 ms, max 100).

Tests:
- 0010 applies on top of the real migrations through `quesar_db::migrate`.
- `session` still has `"token"`; `verification` and `passkey` (with `"publicKey"`) still exist.
- Deleting a `"user"` row cascades to `auth_sessions`, `auth_passkeys` and `auth_flows`.
- The `check` constraints refuse an unknown `kind` or `device_type`.
- Config:
  - the Google fallback per variable;
  - Apple is off when any of its four variables is missing;
  - the origin with a trailing slash and with a path;
  - an invalid origin falls back to the dev origins and the `localhost` RP ID;
  - production excludes the dev origins;
  - `ADMIN_EMAILS=" A@x.com,b@y.com\nc@z.com "` parses;
  - `format!("{config:?}")` contains no secret value.
- `bun run test` still passes. Report that it did.

## Task 2: password hashing and input validation

**Spec source:** `better-auth/dist/api/routes/sign-in.mjs:314-336` (the unknown-user path), `context/create-context.mjs` (`minPasswordLength` 8, `maxPasswordLength` 128), `src/lib/profile-name.ts` (`validateDisplayName`, `DISPLAY_NAME_MAX = 80`), and the client limit in `src/components/auth/login-form.tsx:31`.

`quesar-auth::password`:
- `hash(&Password) -> PhcString` with `argon2` 0.5, Argon2id, `Params::default()`. Those are 19 MiB, t=2, p=1, the OWASP baseline; assert the values in a test.
- `verify(&Password, &PhcString) -> bool`, using argon2's own constant-time check.
- `DUMMY_HASH`: a PHC string with the same parameters, computed once (`OnceLock`) from a random password. Unknown users are verified against it.
- `Password`: a newtype with redacted `Debug` and zeroize.
- A `PasswordHasher` trait wraps hash and verify, so tests can count calls.

`quesar-auth::validate`:
- `display_name(&str)` ports `validateDisplayName` exactly: trim; empty gives "Enter a display name."; more than 80 *characters* (`chars().count()`, matching `[...name].length`) gives "Keep the display name to 80 characters or fewer.".
- `email(&str)` trims, lowercases and syntax-checks. Use a small, documented check (one `@`, non-empty local part, a domain with a dot, no whitespace). The goal is to be no looser than zod's `email()` for the cases the tests list.
- `password_len`: 8 to 128 characters. Below gives `PASSWORD_TOO_SHORT`, above gives `PASSWORD_TOO_LONG`.

Tests:
- A hash round trip.
- A wrong password fails.
- A hash has the `$argon2id$v=19$m=19456,t=2,p=1$` prefix.
- Unknown-user verification calls the hasher exactly once against `DUMMY_HASH` (counting double).
- `Debug` of `Password` is redacted.
- The name cases: 80 multibyte characters pass, 81 fail, blank fails, surrounding spaces are trimmed.
- Email: case and whitespace are normalised; `a@b`, `@b.c`, `a b@c.d` and the empty string are refused.

## Task 3: session store and cookie

**Spec source:** `server.ts:98-99,126-129,183-196`; `src/lib/auth/verify.server.ts`; Better Auth 1.7.19 `context/create-context.mjs:147-149` (`expiresIn` 604800 s, `updateAge` 86400 s, `freshAge` 86400 s) and `api/routes/session.mjs:177-215` (the refresh rule) and `:331-341` (`freshSessionMiddleware`).

`quesar-auth::session`:
- **Constants:** `SESSION_TTL = 7 days`, `UPDATE_AGE = 1 day`, `FRESH_AGE = 1 day`. `COOKIE_NAME = "__Host-quesar.session_token"`.
- **`create(tx, user_id, ip, user_agent, now) -> (SessionRow, SecretToken)`.** It stores only `token_hash`. Truncate `user_agent` to 512 bytes on a char boundary. `ip` is the raw client IP from `rate_limit::client_ip`; Better Auth stores and displays it (`sessions-card.tsx:75`).
- **`resolve(pool, token, now) -> Option<(SessionRow, UserRow, refreshed: bool)>`.** Every call queries the database; there is no cache. An expired row is deleted and resolves to `None`. When `expires_at - SESSION_TTL + UPDATE_AGE <= now`, set `expires_at = now + SESSION_TTL` and `updated_at = now` with `refreshed = true`. If that update affects 0 rows (concurrent revoke), the result is `None`.
- **Other operations:**
  - `revoke(pool, user_id, session_id) -> bool`, scoped to the user;
  - `revoke_others(pool, user_id, keep_id) -> u64`;
  - `delete_by_token`;
  - `list(pool, user_id, now)`, unexpired only, newest first;
  - `is_fresh(&SessionRow, now)`, meaning `now - created_at < FRESH_AGE`;
  - `prune_expired(pool, now)`, also deleting expired `auth_flows`, called on about 1 in 50 creations like the rate limiter's sampling.
- **Cookies.** `set_cookie(token)` gives `__Host-quesar.session_token=<token>; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`, with no `Domain`. `clear_cookie()` gives the same attributes with `Max-Age=0`. `read_cookie(&HeaderMap)` parses every `Cookie` header and takes the first occurrence of the name. A value that is not 43 base64url characters counts as absent, before any database call.

Tests (DB, `FixedClock`):
- Create then resolve.
- The raw token never appears in `auth_sessions` (select every column, assert no column equals or contains it).
- An expired session resolves to `None` and its row is gone.
- Day 0.5 does not refresh; day 1.1 refreshes and extends to day 8.1.
- A refresh racing a revoke gives `None`.
- `revoke` with another user's session id returns false and deletes nothing.
- `revoke_others` keeps the current session.
- `is_fresh` at 23 h 59 m and at 24 h.
- The cookie string: the exact attribute set, and no `Domain`.
- `read_cookie` with two cookies, a duplicate name, a malformed value and a 44-character value.

## Task 4: request checks, errors, rate limits, server wiring

**Spec source:** `src/framework/csrf.ts` (whole file); `src/lib/auth/isolation.server.ts:30-50`; `src/lib/auth/verify.server.ts` (the `UnauthorizedError` name and message); `src/routes/api/auth/$.ts`; `server/crates/quesar-server/src/router.rs` (the existing `api_not_found` envelope).

In `quesar-server`, add `src/auth/mod.rs`, `src/auth/extract.rs` and `src/auth/error.rs`.

**`SameOrigin` (FromRequestParts).** Port `isSameOriginRequest` with the configured origin set in place of `request.url`:
- if `Sec-Fetch-Site` is present, it must be exactly `same-origin`;
- else if `Origin` is present, it must equal one of the trusted origins (`"null"` never does);
- else if `Referer` is present, it must equal a trusted origin or start with one followed by `/`, `?` or `#`;
- else refuse.

`Host` is never read. A refusal is 403 `CrossSiteRequestError`, message "Forbidden: cross-site request blocked".

**`FetchMetadata`.** Port `assertSameSiteRequest`. It allows a missing `Sec-Fetch-Site`, `same-origin`, `none`, and a top-level GET navigation (`sec-fetch-mode: navigate`, method GET, dest not `object` or `embed`). Everything else gets the same 403.

**Envelope.** Success is `{"ok":true,"result":…}`. Failure is `{"ok":false,"error":{"name","code","message"}}`, extending the existing `{name,message}` with a machine `code`. Names:

| Name | Status |
| --- | --- |
| `UnauthorizedError` ("Unauthorized") | 401 |
| `CrossSiteRequestError` | 403 |
| `ValidationError` | 400 |
| `AuthError` | per code |
| `RateLimitedError` | 429, with `Retry-After` in whole seconds, rounded up |
| `AuthUnavailableError` | 503 |
| `NotFoundError` | 404 |

All carry `Cache-Control: no-store`.

**Request-scoped extractors.**
- `AuthUser`: runs `FetchMetadata`, then the session lookup, which gives 401 when absent. It yields `{ user, session }`.
- `MaybeUser`: the same lookup without the 401.
- `ClientIp`: `rate_limit::client_ip`, with `TRUSTED_PROXY=cloudflare` read once.
- `limit(bucket, subject)`: a helper that runs before any handler work.

**Server state.**
- `AppState` gains `auth: Option<AuthServices>`. `AuthServices` holds the pool, `RateLimiter`, `AuthConfig`, `Arc<dyn Clock>`, the provider HTTP client and the deletion hooks from Task 11.
- `router(config)` keeps its signature and builds no auth, so the existing `tests/http.rs` stays unchanged. Add `router_with(config, Option<AuthServices>)`.
- `main` connects when `DATABASE_URL` is set and exits non-zero if it cannot. Without a database, every `/api/auth/*` route returns 503 `AuthUnavailableError` except `/methods` (Task 5).
- Mount `/api/auth` as a nested router with its own fallback `api_not_found`. Otherwise an unknown `/api/auth/x` falls through to the static site's HTML 404.
- Enable axum's `query` and `form` features.
- The `RateLimiter` secret comes from `rate_limit::resolve_secret(APP_ENCRYPTION_KEY, BETTER_AUTH_SECRET)`.

**Logging.** Replace `TraceLayer::new_for_http()` in `main.rs` with a `make_span_with` that records method and `uri().path()` only. OAuth callback queries carry `code` and `state`.

Tests:
- A table test of `SameOrigin`:
  - every `Sec-Fetch-Site` value; `none` is refused here, unlike `FetchMetadata`;
  - `Origin` equal, with a different port, with a different scheme, and `null`;
  - `Host: evil.example` together with `Origin: https://evil.example` is refused;
  - `Referer` `https://quesar.cloud`, `https://quesar.cloud/x`, `https://quesar.cloud?x`, `https://quesar.cloud.evil/`;
  - no headers;
  - dev origins accepted only outside production.
- A table test of `FetchMetadata`, mirroring `isolation.server.ts`.
- A JSON 404 for `/api/auth/nope`.
- A 503 without a database.
- Bucket isolation: an `auth` hit does not consume `auth-general`.
- A log-capture test (tracing test subscriber): a request to `/api/auth/callback/google?code=SECRETCODE&state=SECRETSTATE` logs neither value.

## Task 5: email/password, session and profile endpoints, sign-in methods

**Spec source:** `better-auth/dist/api/routes/sign-up.mjs:145-256`, `sign-in.mjs:305-355`, `session.mjs` (get-session, list-sessions, revoke-session, revoke-other-sessions), `update-user.mjs`; `server.ts:131-150` (the name hooks); `src/lib/auth/methods.server.ts:60-71` (`signInMethods`); `src/lib/auth/email-password.test.ts` and `acceptance-regressions.test.ts:15-31,74-128` (behaviours to re-prove).

Add `quesar-auth::email_password` (core) and `quesar-server/src/auth/routes/{methods,email,session,profile}.rs`. Endpoints and shapes are in the API reference.

**Sign-up.**
- `SameOrigin`, then `auth` bucket by IP.
- Validate the email, then the password length, then the display name.
- An existing lowercased email gives 422 `USER_ALREADY_EXISTS`.
- In one transaction: insert the `"user"` row (`"emailVerified" = false`) and the credential `"account"` row, then create the session.
- Set the cookie.

**Sign-in.**
- `SameOrigin`, then `auth` bucket by IP.
- An invalid email gives 400 `INVALID_EMAIL`. A password over 128 characters gives 400 `PASSWORD_TOO_LONG`.
- An unknown user, a user with no credential account, or a null password runs the dummy verification and gives 401 `INVALID_EMAIL_OR_PASSWORD` "Invalid email or password".
- A wrong password gives the same response.
- A failure sets no cookie.
- On success, create a **new** token, ignoring any presented cookie. If a valid session cookie was presented, delete that session row (fixation hygiene; Better Auth leaves it).

**Sign-out.**
- `SameOrigin` and `auth-general`.
- Delete the presented session if any, always send `clear_cookie()`, and return 200 even when no session was presented.

**Session.**
- `GET /session` uses `FetchMetadata`, `auth-general` and `MaybeUser`.
- It returns `null` or `{user, session}`. When `refreshed`, it re-sends the cookie with a fresh `Max-Age`.

**Profile.**
- `POST /profile {name}`: `AuthUser`, `SameOrigin`, `auth-general`.
- The name goes through `validate::display_name`; a failure is 400 `ValidationError` carrying its exact message.
- Update `name` and `"updatedAt"`.

**Sessions.**
- `GET /sessions` requires `is_fresh`, else 403 `SESSION_NOT_FRESH` (`profile.tsx:175-177` matches on that). Each item carries `current`.
- `POST /sessions/revoke {id}` returns 404 `NotFoundError` when the id is not the caller's.
- `POST /sessions/revoke-others` returns `{revoked}`.

**Methods.**
- `GET /methods` returns `{email, passkey, social}`, with `social` in the order `google`, `apple`, `twitter` and only the configured providers.
- Apple counts only if Task 7's secret mint succeeded.
- `VITE_AUTH_ENABLED=false` or no database gives all false and `[]`.

Tests (axum `oneshot` plus DB):
- The full `email-password.test.ts` scenario: sign-up 200 with `emailVerified` false; sign-in resolves the same user id; a wrong password gives 401 with no `Set-Cookie`; a cross-site sign-up gives 403.
- The name 81×`x` and `"   "` give 400.
- A revoked session is refused by `/session`, by `/profile` (401) and by Task 9's passkey delete.
- Unknown email and wrong password give byte-identical bodies and status.
- The 4th sign-in inside 10 s gives 429 with `Retry-After`, with an injected clock.
- Fixation: sign-in with an attacker-chosen cookie value returns a different token, and the attacker value resolves to nothing. Sign-in with a valid prior cookie deletes that prior session.
- The `Set-Cookie` attributes are exact.
- Sessions:
  - `/sessions` at 25 h gives 403 `SESSION_NOT_FRESH`;
  - revoking another user's session id gives 404 and changes nothing;
  - the token never appears in any response body (grep each JSON);
  - the 1.1-day refresh re-sends the cookie.
- A log capture during sign-up and sign-in shows neither the password nor the token.

## Task 6: OAuth core, mock identity provider, Google

**Spec source:** `server.ts:107-124,155-170`; `src/lib/auth/oauth-provenance.server.ts` (whole); `src/lib/auth/client.ts:17-31`; `src/lib/auth/callback.ts` (the error codes the UI understands); `src/lib/internal.ts:50-80` (`safeInternalPath`); Better Auth `oauth2/state.mjs` (10-minute state, 128-character verifier), `state.mjs:60-90`, `api/routes/callback.mjs:32-171`, `oauth2/link-account.mjs` (`handleOAuthUserInfo`); `@better-auth/core/dist/social-providers/google.mjs` and `oauth2/verify-id-token.mjs` (30 s clock tolerance).

Core modules: `quesar-auth::{oauth::{flow, pkce, jwks, id_token, link, provider}, providers::google}`. HTTP: `quesar-server/src/auth/routes/oauth.rs`.

**Start: `POST /oauth/{provider}/start {callbackURL?, errorCallbackURL?}`.**
- `SameOrigin`, `auth` bucket by IP. An unconfigured provider gives 404 `PROVIDER_NOT_CONFIGURED`.
- `callbackURL` goes through a port of `safeInternalPath` (fallback `/console`).
- `errorCallbackURL` gets the same structural checks without the `/login` denylist (fallback `/login`), because the client sends `/login?next=…` (`callback.ts:24-26`).
- Generate `state` (32 bytes), a PKCE verifier (128 characters from the unreserved set, S256 challenge), a `nonce` (32 bytes, OIDC providers only) and a binding value (32 bytes).
- Insert an `auth_flows` row with `state_hash`, `binding_hash`, `provider`, the payload `{verifier, nonce, callback, errorCallback}`, and `expires_at = now + 600 s`.
- Set `__Host-quesar.oauth_binding=<binding>; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`.
- Return `{url}`.
- Google's authorize parameters: `response_type=code`, `client_id`, `redirect_uri=<origin>/api/auth/callback/google`, `scope=email profile openid`, `state`, `code_challenge`, `code_challenge_method=S256`, `nonce`, `prompt=select_account`, `include_granted_scopes=true`.

**Callback: `GET /callback/{provider}`.**
- Atomically consume the flow with `delete … where state_hash = $1 and kind = 'oauth' returning *`. Replays find nothing.
- Error redirects go to the flow's `errorCallback` with `?error=<code>`, or `/login?error=…` when there is no flow. Never forward the provider's `error_description`. Codes:

  | Condition | Code |
  | --- | --- |
  | no `state` | `state_not_found` |
  | no row | `state_not_found` |
  | row provider ≠ path | `state_mismatch` |
  | expired | `expired` |
  | binding cookie missing or hash unequal (constant-time) | `state_mismatch` |
  | provider `error=access_denied` | `access_denied` |
  | no `code` | `no_code` |

- Then exchange the code at the token endpoint (form POST with `client_secret`, the verifier and the redirect URI).
- Verify the ID token: `jsonwebtoken` 9, RS256 only, `kid` from the JWKS. The JWKS is cached for one hour and refetched at most once a minute on an unknown `kid`. Checks:
  - `iss` ∈ {`https://accounts.google.com`, `accounts.google.com`};
  - `aud` = client id;
  - `exp`, with 30 s leeway;
  - `iat` no older than 1 h;
  - `nonce` equal to the flow's.
- Clear the binding cookie. On success, redirect 303 to `callback` with the session cookie set.

**Linking rule (`oauth::link`).** Ported in one transaction:
1. A Google or Apple `email_verified` that is not `true` gives `provider_email_unverified`, and deletes that account's `oauth_email_verifications` row if the account exists (`validateUserInfo`, `observeOAuthAssertion`).
2. No email gives `email_not_found`.
3. An account (`providerId`, `accountId = sub`) exists: sign in as its user. Set `"emailVerified" = true` if the provider verified and the emails match. Upsert the verification row (`email` lowercased, `verified_at = now()`).
4. Otherwise a user with that lowercased email exists: link only if the provider is Google or Apple **and** the provider verified **and** the local `"emailVerified"` is true. Insert the account and the verification row. Otherwise the result is `account_not_linked`.
5. Otherwise create the user: the name goes through `display_name`, falling back to the email's local part (see Risks). Set `emailVerified` from the provider and `image` from `picture`. Insert the account and, for Google/Apple, the verification row.
6. Create the session.

Mock IdP (`quesar-auth/tests/support/mock_idp.rs`, also used by `quesar-server` tests through a `test-support` feature):
- an axum app on `127.0.0.1:0` serving `/token`, `/jwks` and `/userinfo`;
- it records the requests it receives;
- it signs ID tokens with a committed **fake** RSA key in `tests/fixtures/` (labelled fake in a README line), with claims configurable per test.

Tests:
- The happy path creates a user, a `google` account, a verification row and a session, and redirects to `callbackURL`.
- The authorize URL carries an S256 challenge whose verifier the token request then sends.
- Abuse cases:
  - a replayed state gives `state_not_found`;
  - an expired flow (clock +601 s) gives `expired`;
  - a missing binding cookie or another browser's binding gives `state_mismatch`;
  - a mismatched nonce, a wrong `aud`, a wrong `iss`, an expired token, `iat` over 1 h, a token signed by a key not in the JWKS, and `alg: none` or HS256 are each refused;
  - `email_verified: false` gives `provider_email_unverified`, and an existing verification row is deleted;
  - an unsafe `callbackURL` (`//evil`, `/\evil`, `https://evil`, `/api/x`, `%2f`) falls back to `/console`;
  - provider `access_denied` is forwarded and its description is not.
- Linking:
  - an existing email/password user with the same email is not linked (`account_not_linked`; Contradiction 3);
  - an existing verified Google user signing in again is the same user;
  - a verified user created earlier by Apple is linked by Google.
- The redirect to the error URL never includes the code.
- The log capture shows no code, state or ID token.

## Task 7: Apple

**Spec source:** `src/lib/auth/apple-secret.server.ts` and its test; `methods.server.ts:29-50`; `@better-auth/core/dist/social-providers/apple.mjs`.

**Client secret.** `providers::apple::client_secret(key, now_s)` ports `appleClientSecret` exactly:
- header `{"alg":"ES256","kid":<keyId>}` and payload `{"iss":teamId,"iat":now,"exp":now+15552000,"aud":"https://appleid.apple.com","sub":clientId}`, in that key order;
- JSON-serialised and base64url-encoded;
- the `\n` escapes in the PEM replaced;
- a raw r‖s P-256 signature (`p256` crate, `ecdsa::SigningKey` from PKCS#8).

A malformed key disables Apple with a warning that contains no key material. The process mints at startup and re-mints when the secret is older than 30 days, because a VPS process can outlive the 180-day TTL (the TypeScript mints once per process).

**Contract vectors.** Add `scripts/gen-apple-secret-vectors.ts` (erasable TypeScript, `node scripts/gen-apple-secret-vectors.ts`). It imports the real `appleClientSecret`, uses a committed **fake** P-256 key and a fixed `nowSeconds`, and writes `server/contract/apple-secret-vectors.json`: the key, `now`, the output, and the public key. ES256 is randomised, so the Rust test asserts:
- the header and payload segments of the TypeScript output are byte-equal to Rust's for the same input;
- both signatures verify with the public key;
- the signature is 64 bytes.

**Flow.**
- The authorize URL adds `response_mode=form_post`, `scope=email name` and `nonce`.
- **`POST /callback/apple`** is the single route without `SameOrigin`/`FetchMetadata`. It reads an `application/x-www-form-urlencoded` body capped at 16 KiB through `body_limit::read_body_limited` with fields `code`, `state`, `user` and `error`, and is rate-limited in `auth-general`. Flow:
  - an unknown or expired state redirects to the error URL;
  - otherwise it stores `{code, user}` in the flow's payload once (a second POST for the same state gives `state_mismatch`);
  - then it redirects 303 to `GET /api/auth/callback/apple?state=<state>`, where the Lax binding cookie arrives.
- **The GET** completes the flow as in Task 6:
  - token endpoint `https://appleid.apple.com/auth/token`, with the minted secret;
  - JWKS `https://appleid.apple.com/auth/keys`, `iss` `https://appleid.apple.com`, `aud` = client id, RS256, `iat` no older than 1 h;
  - nonce compared exact-or-SHA-256 (`nonceComparison`);
  - `email_verified` accepts boolean `true` or the string `"true"`;
  - the name comes from `user.name.firstName + " " + lastName`, trimmed, else the token's `name`.

Tests:
- The vectors.
- A form POST with `Sec-Fetch-Site: cross-site` and `Origin: https://appleid.apple.com` is accepted on `/callback/apple`. The same request to `/sign-in` gets 403.
- POST, then GET with the binding completes the sign-in. A replayed POST is refused. A GET without a prior POST gives `no_code`.
- A string `"false"` for `email_verified` is refused.
- A first-sign-in name from `user` is used.
- A 17 KiB body gives 413.
- The `"\\n"`-escaped PEM is accepted.
- Apple is off and absent from `/methods` with a garbage key.

## Task 8: X

**Spec source:** `@better-auth/core/dist/social-providers/twitter.mjs`; `server.ts:113-115`; `admin.server.ts:8-10`.

**Endpoints and scopes.**
- authorize `https://x.com/i/oauth2/authorize`;
- token `https://api.x.com/2/oauth2/token` with **HTTP Basic** client authentication;
- scopes `users.read tweet.read offline.access users.email`, ported as is (see Risks);
- PKCE and state, no nonce, no ID token.

**User info.** Two calls, as the TypeScript does: `GET /2/users/me?user.fields=profile_image_url`, then `?user.fields=confirmed_email`. A failure of the second call is tolerated. `emailVerified` is true only when `confirmed_email` is present. Without it the email is `<id>@twitter.placeholder.invalid`. The account id is `data.id`.

**Linking.** X never links by email (Contradiction 2). An existing account (`twitter`, `id`) signs in. Otherwise, a user that already has the email gives `account_not_linked`; else a new user is created. No `oauth_email_verifications` row is ever written for X.

Tests (mock IdP):
- Basic authentication is sent.
- A placeholder email is used when `confirmed_email` is absent.
- A confirmed email that matches a verified Google-created user is **not** linked (`account_not_linked`).
- A returning X user signs in.
- The second userinfo call failing still signs in with the placeholder.
- No verification row is written.
- State replay and binding tests as in Task 6, reusing its helpers.

## Task 9: passkeys

**Spec source:** `@better-auth/passkey/dist/index.mjs` (`MAX_AGE_IN_SECONDS = 300`, fresh session for registration at `:161-163,398-401`, `excludeCredentials`, list, and delete with ownership); `server.ts:85-87,200`; `src/components/profile/passkeys-card.tsx` (the fields the UI reads); `src/lib/auth/client.ts:33-37`.

Use `webauthn-rs` 0.5 with features `danger-allow-state-serialisation` (ceremony state stored server-side in `auth_flows`, never sent to the client), `conditional-ui` (discoverable sign-in) and `danger-credential-internals` (read `backup_eligible`/`backup_state`). Justify all three in the crate's `Cargo.toml` comments.

**Builder.** `WebauthnBuilder::new(rp_id, first_origin)`, plus `append_allowed_origin` for the rest, plus `rp_name("Quesar")`.

**Registration.**
- `POST /passkey/register/options` requires `AuthUser`, `SameOrigin`, `auth-general` and `is_fresh` (else 403 `SESSION_NOT_FRESH`).
- The user handle is the user's existing `auth_passkeys.user_handle`, else a new UUIDv4. Excluded credentials are the user's existing credential ids.
- Set `authenticator_selection.resident_key = Preferred` on the returned options (Better Auth's `residentKey: "preferred"`), so passkeys are discoverable.
- Store `PasskeyRegistration` in a `passkey_register` flow bound to `user_id`, expiring after 300 s.
- Return `{flowId, options: ccr.public_key}`. That is the `optionsJSON` shape `@simplewebauthn/browser` takes.

**Registration verify.**
- `POST /passkey/register/verify {flowId, credential, name?}` consumes the flow with a `delete … returning` that matches both `id` and `user_id`.
- The name defaults to null and is capped at 80 characters.
- Insert the row with `device_type` `multiDevice` if backup-eligible, else `singleDevice`, and `backed_up` from the backup state.

**Authentication.**
- `POST /passkey/authenticate/options` uses `SameOrigin` and the `auth` bucket. It runs `start_discoverable_authentication` and creates a 300 s flow.
- `POST /passkey/authenticate/verify {flowId, credential}` consumes the flow and runs `identify_discoverable_authentication`. It looks up `auth_passkeys` by credential id and checks the user handle matches, then runs `finish_discoverable_authentication`. On success it updates the stored credential (`update_credential`) and `last_used_at`, and creates a session with the cookie.
- An unknown credential, a handle mismatch or a failed verification gives 401 `PASSKEY_AUTHENTICATION_FAILED`, one message for all three.
- A missing, expired or other-user flow gives 400 `CHALLENGE_NOT_FOUND`.

**Listing and deletion.**
- `GET /passkeys` (`AuthUser`) returns `{passkeys:[{id,name,deviceType,backedUp,createdAt}]}`.
- `POST /passkey/delete {id}` (`AuthUser`, `SameOrigin`) is scoped by `user_id`; any other id gives 404.

Tests:
- Use a software authenticator: `webauthn-authenticator-rs` with `softpasskey` if it builds in the container. Otherwise hand-built `none` attestation and assertions signed with `p256` in a test helper. Record which in the report.
- Register then sign in.
- Abuse cases:
  - a replayed assertion is refused (flow consumed, and counter);
  - an expired flow (+301 s) is refused;
  - another user's register `flowId` is refused;
  - a registration at 25 h gives `SESSION_NOT_FRESH`;
  - a wrong origin in `clientDataJSON` is refused;
  - an assertion for a deleted passkey is refused;
  - deleting another user's passkey gives 404 and the row survives;
  - a revoked session cannot delete (`acceptance-regressions.test.ts:115-127`).
- The excluded credentials list the existing ones.
- One fixture test deserialises a recorded `@simplewebauthn/browser` `RegistrationResponseJSON` and `AuthenticationResponseJSON` into the webauthn-rs types, so M7 has a checked contract.

## Task 10: admin decision

**Spec source:** `src/lib/server/admin.server.ts` (whole) and `admin.server.test.ts` (every case).

`quesar-auth::admin`:
- `decide_admin(&AdminCandidate, &HashSet<String>) -> AdminDecision`, ported line for line:
  - an empty allowlist gives `NoAllowlist`;
  - an email not in the allowlist after trim and lowercase gives `NotAllowlisted`;
  - otherwise, admin requires some verified link whose provider is in {`google`, `apple`}, appears in `providers`, and whose email equals the user's email (both trimmed and lowercased). Else `UnverifiedIdentity`.
- `admin_decision_for(pool, user_id, allowlist)` runs the three queries of `loadAdminCandidate`. A missing user gives `NotAllowlisted`.
- Serialised reasons are `no_allowlist`, `not_allowlisted` and `unverified_identity`. M4 consumes them.

Tests:
- All eight TypeScript cases as Rust tests, named the same:
  - historical provider names without evidence;
  - evidence for another email;
  - a credential account with `emailVerified` false;
  - a credential account with `emailVerified` true;
  - Google, case-insensitively;
  - `credential` plus `apple`;
  - X and passkey;
  - the `grok-*` ids;
  - not allowlisted;
  - an empty allowlist.
- An integration test: a user created through the Task 6 mock Google flow with `ADMIN_EMAILS` set is admin. The same email via email/password is not. A deleted verification row revokes admin.

## Task 11: account deletion

**Spec source:** `src/lib/server/account-deletion.server.ts` and its test (all three cases); `server.ts:171-177`; Better Auth `update-user.mjs:282-340` (`deleteUser`: password check, freshness, hooks, cookie clear); `src/components/profile/delete-account.ts` (the codes the UI matches); `src/lib/server/commerce.server.ts:249-258` and `commerce-wdbx.server.ts:49-56` (`unlinkCommerceAccount`, `wdbxOptions`); `src/lib/workspace-connectors/tokens.server.ts:187-209`.

**Hooks for later milestones (in `quesar-auth::deletion`).**
- `trait CommerceUnlinker { async fn unlink_account(&self, user_id) -> Result<u64, CommerceUnlinkError> }`. M6 implements it. The M2 default is `WdbxConfigGuard`, which ports the configuration check:
  - all four of `WDBX_BINARY`, `WDBX_COMMERCE_DIRECTORY`, `WDBX_COMMERCE_CONFIG` and `WDBX_COMMERCE_HOST_KEY` set and absolute gives `Err(Unavailable)`, because the store cannot be reached before M6 and must fail closed exactly as a WDBX failure aborts deletion in the TypeScript;
  - otherwise, any variable starting with `WDBX_COMMERCE_` with a non-empty value gives `Err(PartialConfiguration)`;
  - otherwise `Ok(0)`.
- `trait WorkspaceRevoker { async fn revoke(&self, user_id, provider) -> bool }`. It is best effort and never fails deletion. M5 implements it. The M2 default `NoWorkspaceRevoker` returns false.

**`purge_and_delete(pool, user_id, hooks)`, in the TypeScript's order.**
1. `unlink_account`. An error aborts with nothing changed.
2. For each `workspace_connections.provider` of the user, call `revoke` and record `{provider, revoked}`. These are external calls, so they run outside the transaction.
3. One transaction:
   - delete `workspace_connections`;
   - delete `audit_access_events` where the actor is the user or the audit is one of the user's;
   - delete `conversation_audits`, `chat_consents`, `field_notes`, and `rate_limits where subject = user_id`;
   - `update inquiries set user_id = null`;
   - **then** `delete from "user"`, which cascades to `account`, `oauth_email_verifications`, Better Auth `session`/`passkey`, `auth_sessions`, `auth_passkeys` and `auth_flows`.
   - It returns the same counts report as the TypeScript (`workspace_connections`, `audit_access_events`, `conversation_audits`, `chat_consents`, `field_notes`, `rate_limits`, `inquiries_unlinked`).

**Endpoint: `POST /delete-account {password?}`.**
- `AuthUser`, `SameOrigin`, `auth` bucket.
- A password is present: a user with no credential account gives 400 `CREDENTIAL_ACCOUNT_NOT_FOUND`; a wrong password gives 400 `INVALID_PASSWORD`.
- No password and not `is_fresh` gives 400 `SESSION_EXPIRED`.
- A purge failure gives 500 `DELETION_FAILED`; a commerce refusal gives 503 `DELETION_UNAVAILABLE`.
- Success clears the cookie and returns `{}`.

Tests:
- The three TypeScript tests:
  - every per-user row goes, the bystander stays, and inquiries are unlinked and kept;
  - a revoke failure still deletes the connection;
  - a late SQL fault via the same trigger on `field_notes` rolls back everything, *including the user row and sessions*, while the revoker was still called once.
- Partial WDBX configuration refuses deletion and leaves every row in place. Complete configuration refuses as `DELETION_UNAVAILABLE`. No WDBX variables proceeds. Use an injected environment, not the process environment.
- The endpoint:
  - a wrong password gives `INVALID_PASSWORD`;
  - 25 h with no password gives `SESSION_EXPIRED`;
  - 25 h with the correct password succeeds;
  - after success, the old cookie resolves to nothing;
  - a cross-site POST gives 403;
  - an `oauth_email_verifications` row is gone after deletion.

## Task 12: router completeness, smoke script, docs, progress log

**Spec source:** the parent plan's Verification section; `scripts/smoke.sh`; `server/README.md`.

- An `http.rs`-style test walks the API reference table. Each route exists with its method. A wrong method gives 405 JSON. Every non-GET route except `POST /callback/apple` refuses a cross-site POST with 403.
- `scripts/smoke.sh`, checks that need no database:
  - `POST /api/auth/sign-in` with `Origin: https://evil.example` gives 403;
  - an Apple-style form POST (`Sec-Fetch-Site: cross-site`, form body) to `/api/auth/callback/apple` gives 303, and the same POST to `/api/auth/sign-in` gives 403;
  - `/api/auth/methods` gives 200 JSON;
  - `/api/auth/nope` gives 404 JSON.
- `scripts/smoke.sh`, checks that need a database: when `scripts/dev-postgres.sh start` succeeds, create a fresh `quesar_smoke` database (dropped first), run `quesar-server migrate`, start the server with it, and run sign-up, `/session`, sign-out and `/session` (null) with curl, sending `Origin`.
- Update `server/README.md`:
  - auth variables (link the `AGENTS.md` table, add `TRUSTED_PROXY`);
  - the dev cookie note (Contradiction 1);
  - the provider redirect URIs `/api/auth/callback/{google,apple,twitter}` (unchanged from Better Auth, so registered URIs carry over).
- Add one M2 entry to the progress log in the parent plan.

## API reference

All paths are under `/api/auth`. Bodies are JSON unless noted. Every response carries `Cache-Control: no-store` and uses the envelope `{"ok":true,"result":R}` or `{"ok":false,"error":{"name","code","message"}}`. Times are ISO 8601 strings.

`User` = `{id, name, email, emailVerified, image|null, createdAt}`. `Session` = `{id, createdAt, expiresAt}`.

Shorthand in the Checks column:
- **SO**: `SameOrigin` (403 `CrossSiteRequestError`).
- **FM**: `FetchMetadata` (403).
- **AU**: `AuthUser` (401 `UnauthorizedError`).
- **RL-a / RL-g**: the `auth` / `auth-general` bucket (429 `RateLimitedError`).
- Every route except `/methods` can answer 503 `AuthUnavailableError`.

| Method, path | Checks | Request | Result | Errors (status, code) |
| --- | --- | --- | --- | --- |
| GET `/methods` | FM, RL-g | — | `{email, passkey, social: ("google"\|"apple"\|"twitter")[]}` | — |
| POST `/sign-up` | SO, RL-a | `{name, email, password}` | `{user, session}` + cookie | 400 `INVALID_EMAIL`, `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `ValidationError` (name); 422 `USER_ALREADY_EXISTS` |
| POST `/sign-in` | SO, RL-a | `{email, password}` | `{user, session}` + cookie | 400 `INVALID_EMAIL`, `PASSWORD_TOO_LONG`; 401 `INVALID_EMAIL_OR_PASSWORD` |
| POST `/sign-out` | SO, RL-g | `{}` | `{}` + cookie cleared | — |
| GET `/session` | FM, RL-g | — | `{user, session}` or `null` (cookie re-sent on refresh) | — |
| POST `/profile` | SO, AU, RL-g | `{name}` | `{user}` | 400 `ValidationError` |
| GET `/sessions` | AU, RL-g | — | `{sessions: [{id, createdAt, expiresAt, ipAddress, userAgent, current}]}` | 403 `SESSION_NOT_FRESH` |
| POST `/sessions/revoke` | SO, AU, RL-g | `{id}` | `{}` | 404 `NOT_FOUND` |
| POST `/sessions/revoke-others` | SO, AU, RL-g | `{}` | `{revoked: number}` | — |
| POST `/oauth/{google\|apple\|twitter}/start` | SO, RL-a | `{callbackURL?, errorCallbackURL?}` | `{url}` + binding cookie | 404 `PROVIDER_NOT_CONFIGURED` |
| GET `/callback/{google\|twitter\|apple}` | FM (navigation passes), RL-g | query `code`, `state`, `error` | 303 to the callback path + session cookie, or 303 to the error path `?error=` one of `access_denied`, `provider_email_unverified`, `state_not_found`, `state_mismatch`, `expired`, `no_code`, `email_not_found`, `account_not_linked`, `failed` | — |
| POST `/callback/apple` | **none** (sole exemption), RL-g | form `code`, `state`, `user`, `error` (≤ 16 KiB) | 303 to `GET /callback/apple?state=…` | 413; 303 to the error path |
| POST `/passkey/register/options` | SO, AU, RL-g | `{}` | `{flowId, options}` (simplewebauthn `optionsJSON`) | 403 `SESSION_NOT_FRESH` |
| POST `/passkey/register/verify` | SO, AU, RL-g | `{flowId, credential, name?}` | `{passkey: {id, name, deviceType, backedUp, createdAt}}` | 400 `CHALLENGE_NOT_FOUND`, `PASSKEY_REGISTRATION_FAILED` |
| POST `/passkey/authenticate/options` | SO, RL-a | `{}` | `{flowId, options}` | — |
| POST `/passkey/authenticate/verify` | SO, RL-a | `{flowId, credential}` | `{user, session}` + cookie | 400 `CHALLENGE_NOT_FOUND`; 401 `PASSKEY_AUTHENTICATION_FAILED` |
| GET `/passkeys` | AU, RL-g | — | `{passkeys: [...]}` | — |
| POST `/passkey/delete` | SO, AU, RL-g | `{id}` | `{}` | 404 `NOT_FOUND` |
| POST `/delete-account` | SO, AU, RL-a | `{password?}` | `{}` + cookie cleared | 400 `INVALID_PASSWORD`, `CREDENTIAL_ACCOUNT_NOT_FOUND`, `SESSION_EXPIRED`; 500 `DELETION_FAILED`; 503 `DELETION_UNAVAILABLE` |

M7 notes:
- `SESSION_NOT_FRESH`, `SESSION_EXPIRED` and `INVALID_PASSWORD` keep the codes `delete-account.ts` and `profile.tsx` already match on.
- The sessions card must revoke by `id`.
- `signInFailure` already understands every callback `error` code above; unknown codes fall to "failed".

## Risks and open questions

Each has the default implementers follow unless Donald decides otherwise.

1. **Sign-up reveals registration.** Without a mailer, sign-up cannot hide that an email exists (Better Auth returns 422 too). *Default:* 422 `USER_ALREADY_EXISTS`, rate-limited at 3 per 10 s per IP. Sign-in stays non-revealing.
2. **X linking (Contradiction 2).** *Default:* X never links by email; a colliding email gives `account_not_linked`.
3. **Provider gives no usable name** (Apple with name hidden, or a name over 80 characters). Today the `validateDisplayName` hook makes that sign-up fail. *Default:* fall back to the email's local part, truncated to 80 characters; the report notes this deviation.
4. **X scopes.** `offline.access` asks for a refresh token nobody stores. *Default:* port the four scopes as they are; dropping it is a one-line follow-up.
5. **Dev origins in production (Contradiction 5).** *Default:* not trusted in production.
6. **`VITE_AUTH_ENABLED=false` and the `dev-user` fallback** (`verify.server.ts:150-210`). *Default:* the Rust server has no dev-user. With the flag set, `/methods` reports nothing and protected routes answer 401 (fail closed).
7. **Software authenticator for passkey tests** may not build. *Default:* the hand-built CBOR helper described in Task 9.
8. **PKCE verifier and nonce are stored unsealed** in `auth_flows` for 10 minutes. *Default:* accept; sealing would make OAuth depend on `APP_ENCRYPTION_KEY`.
9. **Apple secret lifetime.** *Default:* re-mint every 30 days in-process (Task 7), stricter than the TypeScript.
10. **Shared-schema drift until M8.** Better Auth and Rust both write `"user"`/`"account"`. Never point both servers at one database; say so in `server/README.md`.
11. **Session cookie refresh happens only on `GET /session`.** Other routes extend `expires_at` in the database but do not re-send the cookie. The client calls `/session` on every page load, so the browser's cookie never lags by more than a day. *Default:* accept.

### Critical Files for Implementation
- /home/user/quesar.cloud/src/lib/auth/server.ts
- /home/user/quesar.cloud/src/lib/auth/oauth-provenance.server.ts
- /home/user/quesar.cloud/src/lib/server/account-deletion.server.ts
- /home/user/quesar.cloud/server/crates/quesar-server/src/router.rs
- /home/user/quesar.cloud/server/crates/quesar-services/src/rate_limit.rs