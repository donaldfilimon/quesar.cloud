# quesar-server

The Rust server for quesar.cloud. One process serves the site's static export
and `/api/*` from a single origin, so the `__Host-` session cookies and the
same-origin request checks hold without CORS.

**Status: in development.** It is replacing the Next.js server build in stages;
the plan and its progress log are in
`notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md`.
Today it serves the export, answers `/api/readiness` and implements the whole
authentication API (see [Authentication](#authentication)). The console and the
other server features still live in the Node server until their milestone
lands. **Nothing here is deployed.**

## Run

```bash
bun run build:static   # the export it serves (docs/)
bun run server         # http://127.0.0.1:8787
```

| Variable          | Default          | Meaning                                                                                        |
| ----------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `QUESAR_LISTEN`   | `127.0.0.1:8787` | Socket address. Loopback by default: a reverse proxy terminates TLS in front of it.            |
| `QUESAR_SITE_DIR` | `docs`           | The export to serve, relative to the working directory.                                        |
| `QUESAR_ENV`      | unset            | `production` enforces readiness: every request but the probe gets 503 until config is sound.   |
| `PUBLIC_ORIGIN`   | unset            | The public HTTPS origin. Required in production. `BETTER_AUTH_URL` is read as a fallback.      |
| `DATABASE_URL`    | unset            | Postgres. Required in production; there is no in-memory fallback.                              |
| `QUESAR_MIGRATIONS_DIR` | `migrations` | Used by `quesar-server migrate`: the SQL files to apply. |
| `TRUSTED_PROXY` | unset | Which proxy header names the client address for rate limits: `x-real-ip`, `x-forwarded-for` (rightmost hop) or `cloudflare` (`cf-connecting-ip`). Unset or anything else trusts no header and uses the peer socket address. |
| `APP_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET` | unset | The first set one keys the rate-limit subject hash (`APP_ENCRYPTION_KEY` also seals data). In production readiness reports `rate_limit_secret_missing` when neither is set. |
| `RUST_LOG`        | `info`           | Log filter. Logs are JSON on stdout.                                                           |

`/api/readiness` reports the shape of the configuration only. It does not claim
the database answers.

### Client addresses behind a proxy

Rate limits key on the client address. Deliberate difference from the
TypeScript, which always trusted `x-real-ip` because it ran behind Vercel (which
overwrites it): this server trusts **no** header unless `TRUSTED_PROXY` names
one, and otherwise uses the peer address (`ConnectInfo<SocketAddr>`). Behind
Caddy, which passes a client-supplied `X-Real-IP` through, either set
`TRUSTED_PROXY=x-real-ip` and have the Caddyfile overwrite it with
`header_up X-Real-IP {remote_host}`, or set `TRUSTED_PROXY=x-forwarded-for`
(Caddy appends the peer to the end). Trusting a header the proxy does not
overwrite lets every client pick its own rate-limit subject. Under `cloudflare`
a request without `cf-connecting-ip` uses the peer address, not another header.

## Migrate

```bash
DATABASE_URL=postgres://... quesar-server migrate
# from a checkout, without a built binary (both forms pass `migrate` through):
DATABASE_URL=postgres://... bun run server migrate
DATABASE_URL=postgres://... bun run server -- migrate
```

Applies the pending `migrations/*.sql` (top level only; `migrations/auth/` is
ignored) and logs each name. It exits 1 on failure or when `DATABASE_URL` is
unset. It is interchangeable with `bun run db:migrate`: same `_migrations`
table, same advisory lock, one transaction per file. Any other argument exits 2;
no argument serves.

## Authentication

**What exists.** Under `/api/auth/*`: email/password sign-up and sign-in,
database-backed sessions (revoked by id, never by token), sign-in with Google,
Apple and X, passkeys (WebAuthn), the admin decision (an `ADMIN_EMAILS` address
plus a linked Google or Apple identity) and account deletion. The request and
response contract is the "API reference" section of
`notes/superpowers/plans/2026-11-10-rust-server-m2.md`.

**Nothing is deployed.** The frontend still talks to the Node server's Better
Auth until M7 points it at this API. Neither server replaces the other yet, so
do not point both at one database (below).

### Variables

Names only; the table in `AGENTS.md` describes the shared ones. A missing
optional variable switches that feature off, it never falls back to a guess.

| Variable | Meaning when missing |
| --- | --- |
| `DATABASE_URL` | No database: every `/api/auth/*` route but `/methods` answers 503 `AUTH_UNAVAILABLE`. Required in production. |
| `PUBLIC_ORIGIN` (`BETTER_AUTH_URL` as a fallback) | Required in production. It is the same-origin rule, the cookie origin and the passkey relying party. An IP-address origin turns passkeys off (`PASSKEYS_NOT_AVAILABLE`). |
| `QUESAR_ENV` | `production` enforces readiness, refuses http provider endpoints and stops trusting the local dev origins. |
| `TRUSTED_PROXY` | No proxy header is trusted; rate limits use the socket address. See "Client addresses behind a proxy". |
| `APP_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET` | Key the rate-limit subject hash; production readiness fails without one. Sessions do not use them (they are random database tokens). |
| `VITE_AUTH_ENABLED` | Sign-in is on unless this is exactly `false`. When `false`, `/methods` reports nothing and sign-up, sign-in, OAuth and passkey sign-in answer 503. |
| `GOOGLE_SIGNIN_CLIENT_ID`/`_SECRET` (fall back to `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`) | No Google sign-in. |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | No Apple sign-in (all four are needed; an unusable key is logged and turns Apple off). |
| `TWITTER_CLIENT_ID`/`_SECRET` | No X sign-in. |
| `ADMIN_EMAILS` | Nobody is admin. |
| `WDBX_COMMERCE_DIRECTORY`, `WDBX_COMMERCE_CONFIG`, `WDBX_COMMERCE_HOST_KEY` (and `WDBX_BINARY`) | Account deletion answers 503 `DELETION_UNAVAILABLE` both when any `WDBX_COMMERCE_*` is set but the three are not all present, and when the configuration is complete (`WDBX_BINARY` plus the three as absolute paths), because the commerce store cannot be reached before M6. Deletion works only with none of the `WDBX_COMMERCE_*` variables set and no workspace connection on the user; `WDBX_BINARY` alone is irrelevant. |

Provider redirect URIs are `/api/auth/callback/google`, `/api/auth/callback/apple`
and `/api/auth/callback/twitter` on the public origin. They are unchanged from
Better Auth, so the URIs already registered carry over; register them for any
new origin.

### Cookies in development

The session cookie is `__Host-quesar.session_token` with `Secure`,
`SameSite=Lax` and `Path=/`, in every mode, as the TypeScript sets it. Chrome and
Firefox accept `Secure` cookies on `http://localhost`, so local development
works without a different cookie. `curl` does not send them over http: pass the
`name=value` pair in a `Cookie` header, as `scripts/smoke.sh` does.

### The database must start empty

A Rust database must start empty and be migrated by `quesar-server migrate`.
Never import Better Auth rows. Better Auth marks X-created users email-verified
when X returns a confirmed address; this server never does, because that would
let an X account take over a local account at the same address. Better Auth and
this server also both write `"user"` and `"account"`, so they must not share a
database until M8 removes Better Auth.

### Before go-live

- One real Apple sign-in on staging, to confirm Apple echoes the `nonce` claim
  in the ID token (the TypeScript never checked it; this server does).
- Register the three OAuth redirect URIs above for the new origin.
- Make the proxy header trustworthy: the Caddyfile must overwrite `X-Real-IP`
  (`header_up X-Real-IP {remote_host}`) and the server run with
  `TRUSTED_PROXY=x-real-ip`, or run with `TRUSTED_PROXY=x-forwarded-for`.
  Without either, every client shares the proxy's rate-limit subject.

## Database tests

The database tests in both `quesar-db` and `quesar-services` need a Postgres,
read from `TEST_DATABASE_URL`, and fail (never skip) without it; an empty value
counts as unset. `scripts/dev-postgres.sh start` runs a throwaway one on
`127.0.0.1:54329` (`QUESAR_TEST_PG_PORT` changes the port; trust auth, superuser
`quesar`, TCP only) and prints its URL; `stop` removes it.
`scripts/dev-postgres.sh exec <cmd...>` starts it, exports `TEST_DATABASE_URL`
and runs the command in place; if PostgreSQL cannot start it exits with the
script's status and message instead. `bun run check:server` runs `cargo test`
through `exec`, so PostgreSQL binaries must be installed locally (unless
`TEST_DATABASE_URL` is already exported). Each test gets its own
database via `quesar_db::test_support::TestDatabase` (cargo feature
`test-support`).

## Check

```bash
bun run check:server   # cargo fmt --check, clippy -D warnings, cargo test
scripts/smoke.sh       # starts the server against docs/ and checks it with curl
```

`scripts/smoke.sh` starts two servers. The first has no database and checks the
static site and what `/api/auth` answers without one (`/methods` works, the
rest is 503). The second runs when `scripts/dev-postgres.sh start` succeeds: it
gets a fresh `quesar_smoke` database, runs `migrate`, and checks the cross-site
refusals, Apple's form POST, a JSON 404 and 405, and sign-up, `/session`,
sign-out and `/session` again. Without PostgreSQL binaries it prints a `skip`
line for those and still passes.

`bun run check` runs `check:server` as one of its steps. The root lint,
prettier, tsconfig and vitest do not cover this directory.

## Sealing contract with the Node server

`quesar-services` seals data at rest exactly as `src/lib/server/crypto.server.ts`
does (`v1.<iv>.<ct>.<tag>`, AES-256-GCM under `HMAC-SHA256(key, "quesar:seal")`,
associated data always supplied). The vectors in `server/contract/` pin that in
both directions; `src/lib/server/crypto-contract.test.ts` opens both files with
the TypeScript, and the Rust tests open both with Rust. The keys in them are
fake test keys. To regenerate (only when the format changes):

```bash
GEN_CONTRACT_VECTORS=1 bunx vitest run src/lib/server/crypto-contract.test.ts
cargo run --manifest-path server/Cargo.toml -p quesar-services --example gen_vectors
```
