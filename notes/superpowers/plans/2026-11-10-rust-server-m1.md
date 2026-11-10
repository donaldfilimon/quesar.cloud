# Rust server M1: data layer, sealing, rate limits, page security headers

Parent plan: `notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md` (milestone M1). M0 is done: `server/` holds one crate, `quesar-server`, which serves the static export and `/api/readiness`.

## Global Constraints

- **The TypeScript file named in each task is the behavioural spec.** Port its behaviour, formats, constants, bucket names and error cases exactly. Where this plan and the TypeScript disagree on a value, the TypeScript wins; say so in the report.
- Work only under `server/`, `scripts/`, `package.json`, `.gitignore`, and the files a task names. Do not change `src/`, `app/`, `migrations/*.sql`, `docs/` or any TypeScript server code: the Node server stays a working parity oracle.
- Rust: edition 2024, `unsafe` forbidden, `cargo fmt` clean, `cargo clippy --all-targets -- -D warnings` clean (the workspace denies `clippy::all`). No `unwrap`/`expect`/`panic!` outside tests and `main`'s startup path. Errors are typed enums implementing `std::error::Error`, not strings.
- Crates live in `server/crates/<name>/` and inherit `edition`, `rust-version`, `publish` and `[lints]` from the workspace, as `server/crates/quesar-server/Cargo.toml` does.
- Database access is `sqlx` 0.8 with features `postgres`, `runtime-tokio`, `tls-rustls-ring-webpki` and runtime-checked queries (`sqlx::query`, never the `query!` macros), so builds need no database.
- Secrets never appear in logs, error messages or `Debug` output.
- Tests that need Postgres read `TEST_DATABASE_URL`. If it is unset they **fail** with a message naming `scripts/dev-postgres.sh`; they never skip silently. Tests that need no database must not require one.
- `bun run check:server` must pass at the end of every task, run from the repo root.
- Commit messages: conventional commits (`feat(server): ...`), ending with the two trailer lines the dispatch gives you.

## Task 1: `quesar-db` crate, migration runner, dev Postgres script

**Spec source:** `scripts/migrate.ts` (the migration runner to match), `src/lib/db.ts` (how the Node side picks and normalizes the database), `migrations/*.sql`.

Create `server/crates/quesar-db`:

- `pool.rs`: `connect(database_url: &str) -> Result<PgPool, DbError>` with a bounded pool (max 10 connections, 5 s acquire timeout).
- `migrate.rs`: `migrate(pool: &PgPool, dir: &Path) -> Result<Vec<String>, MigrateError>`, returning the names it applied in order. It must match `scripts/migrate.ts`:
  - reads `*.sql` directly in `dir`, non-recursively, in the same sort order;
  - records applied files in the same bookkeeping table with the same column(s), so a database migrated by either runner is seen as migrated by the other;
  - takes the same Postgres advisory lock (same key or keys) for the duration, and releases it;
  - applies each file in a transaction with its bookkeeping row, and stops at the first failure without recording that file.
- `lib.rs` re-exports the above and the error types.

In `quesar-server`:

- `main.rs` gains a `migrate` subcommand: `quesar-server migrate` connects with `DATABASE_URL`, applies `QUESAR_MIGRATIONS_DIR` (default `migrations`), logs each applied name, and exits non-zero on failure or when `DATABASE_URL` is unset. Running with no argument still serves. Parse arguments by hand (`std::env::args`); do not add a CLI crate. Any other argument prints a one-line usage message to stderr and exits with status 2.
- The server does not open a pool yet; later milestones do.

Add `scripts/dev-postgres.sh`:

- `scripts/dev-postgres.sh start` ensures a throwaway PostgreSQL is running on `127.0.0.1` port `${QUESAR_TEST_PG_PORT:-54329}` with trust auth and a superuser named `quesar`, then prints exactly one line to stdout: `postgres://quesar@127.0.0.1:<port>/postgres`. It is idempotent: a second `start` prints the same URL without re-initialising.
- `scripts/dev-postgres.sh stop` stops it and removes the data directory.
- It finds `initdb`/`pg_ctl` on `PATH`, else in `/usr/lib/postgresql/*/bin` (newest version), and exits 3 with a clear message if neither exists.
- PostgreSQL refuses to run as root. When the script runs as root it must run the server as the `postgres` system user with the data directory under `/tmp` (this is the cloud container's situation and is verified to work there: `runuser -u postgres -- initdb ...`). When not root it runs as the current user with the data directory under `${TMPDIR:-/tmp}`.
- If `TEST_DATABASE_URL` is already set, `start` prints it and does nothing else.

Change the `check:server` script in `package.json` so the cargo test step runs with `TEST_DATABASE_URL` set from `scripts/dev-postgres.sh start`. Keep fmt and clippy first. The script must still work when the caller already exports `TEST_DATABASE_URL`.

Tests (in `quesar-db`, against `TEST_DATABASE_URL`):

- A shared test helper creates a uniquely named database per test and drops it afterwards, so tests run in parallel without sharing state. Put it where later crates can reuse it (a `test-support` cargo feature on `quesar-db`, or a small `quesar-test-support` crate: your choice, say which in the report).
- Applying the repository's real `migrations/` to an empty database succeeds, returns every file name in order, and creates the tables (assert at least `user`, `session`, `rate_limits`, `field_notes`).
- A second run applies nothing and returns an empty list.
- A directory with a failing second file applies the first, records only the first, and returns an error naming the failing file.
- Two concurrent `migrate` calls on one database both succeed and each file is applied exactly once.
- Files in subdirectories (the repository has `migrations/auth/`) are ignored.

Document the new commands in `server/README.md` (the `migrate` subcommand, `QUESAR_MIGRATIONS_DIR`, `scripts/dev-postgres.sh`, `TEST_DATABASE_URL`).

## Task 2: `quesar-services` crate with AES-256-GCM sealing

**Spec source:** `src/lib/server/crypto.server.ts` and its test `src/lib/server/crypto.server.test.ts`.

Create `server/crates/quesar-services` with a `crypto` module that is byte-compatible with the TypeScript sealing:

- the same envelope text format and version prefix, the same IV and tag lengths, the same encoding of each part;
- the same key parsing rules for `APP_ENCRYPTION_KEY` and `APP_ENCRYPTION_KEY_PREVIOUS` (accepted encodings, required length);
- the same use of associated data;
- the same rotation behaviour: seal with the current key; open with the current key and fall back to the previous key;
- the same refusal cases as distinct error variants (no key configured, malformed envelope, unknown version, authentication failure). Error text must not include key material or plaintext.

Shape: a `SealingKeys` type built from the two optional raw key strings (so it is testable without process environment), with `seal(plaintext, associated_data)` and `open(envelope, associated_data)`. Key bytes are zeroized on drop (`zeroize` crate) and the type's `Debug` prints no key material. Use the RustCrypto `aes-gcm` crate and the operating system RNG for IVs.

Cross-language vectors:

- Add `scripts/gen-crypto-vectors.ts` (erasable TypeScript, runs with `node scripts/gen-crypto-vectors.ts`). It imports the real functions from `src/lib/server/crypto.server.ts`, seals a fixed set of cases with fixed test keys, and writes `server/contract/crypto-vectors.json`. Cases: empty plaintext, ASCII, multi-byte UTF-8, a 64 KiB payload, with and without associated data if the TypeScript allows both, and one case sealed under the "previous" key. The file records the test keys, the associated data, the plaintext (base64) and the envelope. Commit the generated file. If importing `crypto.server.ts` under plain Node fails because of its imports, stop and report NEEDS_CONTEXT with the error instead of reimplementing the sealing in the script.
- A Rust test opens every vector in that file and gets the recorded plaintext.
- A Rust test binary or `#[test]` writes nothing to the repository. For the reverse direction add `server/contract/crypto-vectors-rust.json`, generated once by a small `cargo run -p quesar-services --example gen_vectors` example that seals the same plaintext cases with the same test keys, and commit it. Add a vitest file `src/lib/server/crypto-contract.test.ts` that opens every Rust-sealed vector with the real TypeScript `open` function. (This one new test file under `src/` is the exception to the "do not change `src/`" constraint.)

Other Rust tests: round trip; wrong associated data fails; a flipped bit in each envelope part fails; truncated and malformed envelopes return the malformed variant; opening with only a previous key configured works; sealing with no current key returns the no-key variant; two seals of the same plaintext differ.

## Task 3: database-backed rate limiting

**Spec source:** `src/lib/server/rate-limit.server.ts`, its test `src/lib/server/rate-limit.server.test.ts`, and `migrations/0007_rate_limits.sql`. Depends on Task 1 (pool, test helper) and lives in `quesar-services` (Task 2).

Add a `rate_limit` module to `quesar-services`:

- the same fixed-window algorithm against the `rate_limits` table, with the same SQL semantics (one atomic upsert per check, so concurrent requests cannot exceed the limit);
- the same named buckets with the same limits and window lengths, as a Rust enum with one method returning its policy;
- the same subject derivation: how a client identity (IP or user id) becomes the stored key, including the HMAC and where its secret comes from. The secret is passed in explicitly (a constructor argument), not read from the process environment inside the module;
- the same result shape: allowed or refused, and the retry-after value the TypeScript returns;
- the same cleanup of expired rows, if the TypeScript does any.

Cross-language check: add `server/contract/rate-limit-subjects.json`, produced by a `scripts/gen-rate-limit-vectors.ts` script that calls the real TypeScript subject function with a fixed secret and a handful of identities (IPv4, IPv6, a user id). A Rust test derives the same stored keys. Commit the generated file. If the TypeScript subject function is not exported, report NEEDS_CONTEXT instead of changing `src/`.

Rust tests (Postgres via the Task 1 helper): requests up to the limit are allowed and the next is refused with a positive retry-after; a new window allows again (inject the clock: the limiter takes "now" as a parameter or through a small clock trait, do not sleep); different subjects and different buckets do not affect each other; 50 concurrent checks against a limit of 10 allow exactly 10.

## Task 4: body limits and security headers on pages

**Spec source:** `src/lib/server/body-limit.server.ts`, `src/lib/server/csp.ts` (read its header comment: it is the rule for adding an origin), and `proxy.server.ts` (which responses get the headers).

In `quesar-server`:

- `csp.rs`: build the same Content-Security-Policy value as `buildCsp`, directive for directive, for production and for development, with the same header name (it is report-only today; keep it report-only) and the same `Reporting-Endpoints` value. A unit test asserts the full production header string equals the string the TypeScript produces. Get that expected string by running the TypeScript (`node -e` or a short script importing `src/lib/server/csp.ts`) and paste it into the test as a literal, with a comment naming how it was produced.
- Apply both headers to HTML page responses from the static site, including the 404 page, and to no other response: not `/api/*`, not assets, not media. Development mode (`QUESAR_ENV` not `production`) uses the development policy.
- `body_limit.rs`: port the byte-capped body read with the same named limits and the same refusal status. Expose it as an axum extractor or helper that later milestones' handlers will use. No endpoint uses it yet, so test it directly: a body at the limit is accepted, one byte over is refused with the TypeScript's status code, a missing or lying `Content-Length` cannot bypass the cap (the stream is counted, not the header), and a chunked body over the cap is refused without buffering the whole body.

Extend `server/crates/quesar-server/tests/http.rs` with: pages and the 404 page carry both headers; an asset, `feed.xml`, `/api/readiness` and an unknown `/api` path do not. Extend `scripts/smoke.sh` with one check that the home page carries the CSP header and one that `/api/readiness` does not.

Update the progress log at the bottom of `notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md` with one M1 entry listing what now exists.
