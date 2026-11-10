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
| `RUST_LOG`        | `info`           | Log filter. Logs are JSON on stdout.                                                           |

`/api/readiness` reports the shape of the configuration only. It does not claim
the database answers.

## Check

```bash
bun run check:server   # cargo fmt --check, clippy -D warnings, cargo test
scripts/smoke.sh       # starts the server against docs/ and checks it with curl
```

`bun run check` runs `check:server` as one of its steps. The root lint,
prettier, tsconfig and vitest do not cover this directory.
