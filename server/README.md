# quesar-server

The Rust server for quesar.cloud. One process serves the site's static export
and `/api/*` from a single origin, so the `__Host-` session cookies and the
same-origin request checks hold without CORS.

**Status: in development.** It is replacing the Next.js server build in stages;
the plan and its progress log are in
`notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md`.
Today it serves the export and answers `/api/readiness`. Accounts, the console
and the other server features still live in the Node server until their
milestone lands. Nothing here is deployed.

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
# from a checkout, without a built binary:
DATABASE_URL=postgres://... bun run server -- migrate
# or: cargo run --manifest-path server/Cargo.toml -p quesar-server -- migrate
```

Applies the pending `migrations/*.sql` (top level only; `migrations/auth/` is
ignored) and logs each name. It exits 1 on failure or when `DATABASE_URL` is
unset. It is interchangeable with `bun run db:migrate`: same `_migrations`
table, same advisory lock, one transaction per file. Any other argument exits 2;
no argument serves.

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
