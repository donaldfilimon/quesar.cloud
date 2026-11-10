# Rust server backend and site improvements for quesar.cloud

## Context

The live site (`https://quesar.cloud`) is a static export on GitHub Pages. Everything that needs a server (sign-in, console, profile, admin, workspace, stored contact inquiries, telemetry, invoice requests) is switched off there and shows `ServerOnlyNotice`. The server that would run those features is Next.js on Node with Better Auth, and it has had no host since Vercel was removed on 2026-10-26.

Donald's decisions for this effort:

- A Rust backend **replaces the Node server entirely**, sign-in included.
- It runs on **his own server/VPS**.
- The same effort covers four improvement areas: dead features on, design/UX pass, performance and quality, films and content.
- Delivery is **one long branch**, one PR at the end.

Outcome: one Rust binary on the VPS serves the site and `/api/*` from a single origin, with accounts, console, admin, workspace and commerce working for visitors; GitHub Pages stays as the honest static fallback until DNS cutover.

## Design decisions

**Topology: single origin.** Next becomes export-only. An axum server serves the export and `/api/*` behind Caddy. Required by the `__Host-quesar.*` cookies and the same-origin CSRF rules (`src/framework/csrf.ts`, `src/lib/auth/isolation.server.ts`).

- Two exports from one config: `build:static` unchanged (to `docs/`, notices on, for Pages); new `build:site` (`VITE_STATIC_SITE=false`, `VITE_AUTH_ENABLED=true`, to git-ignored `server/site/`).
- `next dev` keeps port 8080 and rewrites `/api/:path*` to the Rust server on `127.0.0.1:8787`.
- `/quasar/site/$id` becomes `/quasar/site?id=…` (it is `ssr: false` and browser-only); Rust redirects the old form.
- Rust compares `Origin` to a configured `PUBLIC_ORIGIN`, never the proxied `Host`.

**Client contract: keep the call-site shape, name each function.** `serverFn<In, Out>("console.sendChat")` posts plain JSON to `/api/fn/console.sendChat`, keeping the `{ ok, result } | { ok: false, error: { name, message } }` envelope and the error names the UI matches on (`UnauthorizedError`, `CrossSiteRequestError`, `ValidationError`).

- Rust owns the wire types; `ts-rs` exports them to `src/lib/api/generated/` (committed), with a cargo test that fails on drift.
- seroval is dropped: handlers already return ISO strings; audit `undefined` handling and any UI that prints zod messages.
- `loadGithub` stops being a server function; the browser-direct plus snapshot path already works.

**Auth in Rust** (no production users exist, so nothing to migrate):

- Passwords: `argon2` (argon2id), with a new `auth` rate-limit bucket.
- Sessions: opaque 32-byte token in `__Host-quesar.session_token`; the DB stores its SHA-256; every read hits the DB.
- OAuth for Google, Apple, X: `oauth2` + `jsonwebtoken`; PKCE/state/nonce in a DB `auth_flows` row (Apple's callback is a cross-site form POST, so a Lax cookie would not arrive). Apple client secret ported from `src/lib/auth/apple-secret.server.ts`.
- Linking rule, admin rule and deletion ported as they are: `src/lib/server/admin.server.ts` (`decideAdmin` and its refusal tests), `src/lib/server/account-deletion.server.ts` (`purgeUserData`).
- Passkeys: `webauthn-rs` server side, `@simplewebauthn/browser` client side.
- Schema: keep `user`, `account`, `oauth_email_verifications`; new `migrations/0010_rust_auth.sql` for `session.token_hash`, a recreated `passkey`, and `auth_flows` replacing `verification`.
- Frontend: `src/lib/auth/client.ts` becomes a small hand-written client with the same surface. Call sites: `src/components/auth/login-form.tsx`, `src/components/profile/passkeys-card.tsx`, `src/components/profile/delete-account-card.tsx`, `src/routes/profile.tsx`, `src/lib/auth/use-current-user.ts`, `src/lib/auth/gates.tsx`, `src/lib/auth/provider.tsx`.

**Data layer.** `sqlx` (Postgres, rustls, runtime-checked queries). A small Rust migration runner honors the existing `migrations/*.sql`, the `_migrations` table and the advisory lock used by `scripts/migrate.ts`; exposed as `quesar-server migrate`. Production refuses to start without `DATABASE_URL` (no in-memory fallback).

**Reused contracts, ported exactly:**

- AES-256-GCM envelope `v1.iv.ct.tag` with per-row associated data and key rotation (`src/lib/server/crypto.server.ts`); cross-language test vectors generated from the TS code.
- Fixed-window rate limiting on `rate_limits` with HMAC-hashed subjects (`src/lib/server/rate-limit.server.ts`).
- LLM interface and its honest `not_configured` state (`src/lib/server/llm/`).
- The `wdbx typed inspect` / `typed commit` protocol, locks, retries and directory checks (`src/lib/server/commerce-wdbx.server.ts`), by spawning the binary with `tokio::process`.
- Workspace connectors (`src/lib/workspace-connectors/`), Turnstile, telemetry allowlist, CSP builder, readiness (config shape only).

**Crate layout:** `server/` cargo workspace at the repo root, ignored by lint, prettier, tsconfig and vitest like `sidecars/`.

| Crate | Contents |
| --- | --- |
| `quesar-server` (bin) | axum router, static serving with cache headers and `404.html`, `/api/fn` table, `migrate` subcommand, graceful shutdown |
| `quesar-auth` | sessions, password, OAuth, passkeys, admin |
| `quesar-db` | pool, migration runner, row types |
| `quesar-services` | crypto, rate limit, LLM, inquiries, telemetry, Turnstile, workspace connectors, commerce |
| `quesar-contract` | wire types and `ts-rs` export |

Audit expiry becomes an in-process daily task under a Postgres advisory lock; `/api/cron/audits-expire` and `CRON_SECRET` are retired.

## Milestones (one branch, gate runnable at each)

| # | Milestone | Size |
| --- | --- | --- |
| M0 | Workspace skeleton, static serving and 404, readiness, config, `check:server` (fmt, clippy `-D warnings`, test) wired into `bun run check`, dev rewrites, `build:site` | M |
| M1 | DB pool, migration runner, crypto with TS vectors, rate limit, body limits, CSP | M |
| M2 | Auth: `0010`, sessions, email/password, OAuth ×3, passkeys, deletion, admin, Fetch-Metadata | XL |
| M3 | Public functions: inquiries and Turnstile, telemetry, csp-report, sign-in methods, quasar and billing config | M |
| M4 | Signed-in functions: notes, profile, console (LLM, consent, audits), admin, desk and persona, expiry job | L |
| M5 | Workspace OAuth, Drive and SharePoint | L |
| M6 | Commerce through the spawned `wdbx` binary | M |
| M7 | Frontend switch: named `serverFn` client, new auth client, generated types, `/quasar/site?id=`, e2e against Rust. This is "dead features on". | L |
| M8 | Delete the Node path (Better Auth, pg, PGLite, kysely, seroval, dispatcher, `proxy.server.ts`, server-mode build, ported server tests); rewrite `CLAUDE.md`, `AGENTS.md`, `README.md`, `notes/deploy/*`, `notes/commerce/persistent-server.md` | M |
| M9 | Deploy artifacts: Dockerfile, compose (Postgres and Caddy), systemd alternative, backup notes, cutover and rollback runbook | M |
| M10 | Performance and quality: re-baseline `scripts/check-static.ts` budgets, widen `e2e/accessibility.spec.ts`, media diet for `public/` | M |
| M11 | Design/UX pass per `notes/superpowers/specs/2026-10-25-blueprint-redesign.md` | L |
| M12 | Films per `notes/superpowers/plans/2026-10-01-film-completion.md` | XL |

Ordering notes:

- M11, M12 and the public-route parts of M10 are frontend-only and can interleave any time after M0.
- The budget re-baseline waits for M8, because M7 and M8 change the bundles.
- The roughly 26 server vitest files are ported to cargo in their milestone but deleted only at M8, so the Node path stays a parity oracle until then. The other ~87 stay.
- `build:static` rewrites `docs/` at every gate run: restore it each time and commit a single `build(docs)` at the end, per `.claude/skills/quesar-static-publish/SKILL.md`.
- Merge `main` into the branch regularly; never rebase or force-push.

**First working session:** M0 complete, plus three environment unknowns settled: cargo can fetch crates through the proxy, a test Postgres can start in the cloud container (existing URL, local `initdb`, or the `postgresql_embedded` crate), and `webauthn-rs` builds (it needs OpenSSL; a pure-Rust WebAuthn crate is the fallback).

## Decisions left with Donald

Defaults I will follow unless told otherwise:

- **WDBX test rule:** keep "missing binary is a failure, never a skip" inside `bun run check` (so the gate stays red in cloud sessions). Alternative: move the real-binary suite to a separate `test:wdbx` required on the release checklist. A fake in-workspace binary drives protocol tests either way.
- **Env renames** in the `AGENTS.md` table: `BETTER_AUTH_URL` to `PUBLIC_ORIGIN`; `BETTER_AUTH_SECRET` retired, with a dedicated key for the rate-limit HMAC salt. Applied at M8 with the doc rewrite.
- **Password reset** stays out of scope (there is no mailer today).

Only Donald can supply: the VPS, DNS and TLS hostname (and a staging host), OAuth redirect URIs for the new origin (Google sign-in, Google workspace, Microsoft, Apple with its `.p8` key, X), the passkey RP ID, all secrets, and the `wdbx` binary with its host config and key on the server.

## Risks

- Auth is security-critical new code replacing a library; it gets the most tests and a mocked identity provider.
- The plan is months of work on one branch; nothing ships until the end, and drift from `main` grows.
- Building the external `wdbx` repo is blocked in cloud sessions, so real-binary commerce tests run only where the binary exists.
- Cold cargo builds slow the push hook.

## Verification

- **Each milestone:** `bun run check` (now including `check:server`), `bun run build:static`, `bun run check:static`, `bun run check:seo`, `bun run test:e2e -- --trace off`.
- **Smoke script** (`scripts/smoke.sh`, curl against a local server and Postgres): readiness, 404 status, cache headers, a cross-site POST refused with 403, the Apple-style form POST allowed only on its callback.
- **Parity, M1 to M7:** the same requests against the Node dev server and the Rust server; diff status and JSON shape. Crypto envelopes sealed by TS open in Rust and the reverse.
- **End to end:** a Playwright project whose `webServer` is the Rust binary serving `server/site/`: sign-up, sign-out, notes, consent and chat with the existing AI provider fixture, the admin refusal, the contact form. The `docs/` projects stay for the Pages fallback.
- **Before cutover:** restore drill for Postgres and the WDBX store on a staging host.

## Progress log

- **2026-11-10, M0 (skeleton).** `server/` workspace with `quesar-server`: static serving of the export with the 404 page, cache headers, byte ranges and traversal refusal; `/api/readiness`; the production readiness gate; `bun run check:server` in `bun run check`; `scripts/smoke.sh`. Deferred from M0 to M7, because they would break the Node dev server while it still owns `/api/*`: `build:site` and the `next dev` rewrites. Only `quesar-server` exists so far; the other crates are added when they have content.
- **Environment unknowns, settled in the cloud container:** cargo fetches crates through the proxy; PostgreSQL 16 server binaries are in `/usr/lib/postgresql/16/bin` and start under the `postgres` user with a data directory in `/tmp` (not as root); `webauthn-rs` 0.5, `sqlx` 0.8 and `argon2` 0.5 build (OpenSSL 3 headers are present).
- **2026-11-10, M1 (foundations, complete).** Exists: `quesar-db` (pool, migration runner compatible with `scripts/migrate.ts`, `quesar-server migrate`, `scripts/dev-postgres.sh`); `quesar-services` with `crypto` (AES-256-GCM sealing byte-compatible with `crypto.server.ts`, two-way contract vectors in `server/contract/`) and `rate_limit` (same buckets, SQL and subject hash as `rate-limit.server.ts`); in `quesar-server`, `csp` (the report-only Content-Security-Policy and `Reporting-Endpoints` headers, equal to `csp.ts`'s strings for production and development, applied to HTML pages and the 404 page only) and `body_limit` (byte-capped body reads and extractors with `body-limit.server.ts`'s limits and statuses: 413 over the cap, 400 for non-object JSON; the stream is counted, not `Content-Length`). `scripts/smoke.sh` now has 18 checks. Added by the final-review fix wave: proxy trust (`TRUSTED_PROXY` = `x-real-ip`, `x-forwarded-for` or `cloudflare`; default none, so the peer address from `into_make_service_with_connect_info` is used; deliberately not the TypeScript's unconditional `x-real-ip`); `client_ip_from_headers`, which joins repeated header lines like Fetch; a production readiness reason `rate_limit_secret_missing` (the public fallback HMAC key is refused in production); and one key parser, `quesar_services::crypto::key_state`, that readiness now uses. The Caddyfile in M9 must set `header_up X-Real-IP {remote_host}` (or the server runs with `TRUSTED_PROXY=x-forwarded-for`).
- **2026-11-10, M2 (authentication, complete).** `quesar-auth` (core, no HTTP) and `/api/auth/*` in `quesar-server`: email/password with Argon2id (a bounded hashing pool), database-backed sessions (random tokens, hashed at rest, refreshed daily on `GET /session`, revoked by id), Google, Apple (client secret re-minted in process, ID token fully verified, cross-site form POST turned into a redirect so the Lax cookies arrive) and X (never links by email, never makes a user email-verified), passkeys on `webauthn-rs`, the admin decision, and account deletion (one transaction; fails closed with 503 `DELETION_UNAVAILABLE` when commerce config is partial or a workspace grant exists and no revoker does). Request checks: same-origin and Fetch-Metadata rules, `auth`/`auth-general` rate limits keyed by the client address, 16 KiB body cap, JSON 404 and 405, the auth-off allow-list. The API reference in the M2 plan describes what was built. Not done, by design: nothing deployed; the frontend and the Node server are unchanged until M7; a Rust database must start empty (never import Better Auth rows). Before go-live: one real Apple sign-in on staging (nonce claim), OAuth redirect URIs for the new origin, the proxy's `X-Real-IP` or `TRUSTED_PROXY`. Deviations from the TypeScript are recorded in the task reports and the M2 plan.
