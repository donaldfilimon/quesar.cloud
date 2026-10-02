# Backend acceptance — 2026-10-01

Status: Partial. Disposable local Postgres evidence is not staging/production evidence.

## Local database baseline
- PostgreSQL 17.11 (Homebrew); isolated initdb under `/tmp/quesar-completion-20261001/postgres`, bound only to 127.0.0.1:55471. No shared database URL used.
- `DATABASE_URL=postgresql://127.0.0.1:55471/quesar_acceptance bun run db:migrate`: exit 0, eight migrations 0001 through 0008 applied.
- Repeat identical migration command: exit 0, `[migrate] up to date.`
- `_migrations` row count: 8. Public tables include auth, passkey, inquiries, notes, consents, sealed audits, workspace connections, rate limits and telemetry.
- `pg_dump -Fc` into scratch followed by `pg_restore --exit-on-error` into separate `quesar_restore_acceptance`: command chain exit 0, restored `_migrations` count 8. Schema restore proven; seeded user-data persistence and staging backup/restore not yet proven.

## Remaining acceptance
Concurrent migrators, previous-schema upgrade, seeded data/restart isolation, account/passkey/social workflows, model calls, workspace provider round trips, local generation/edit, protected previews, deployed readiness, provider failures and production cutover remain unverified.

Current process environment lacks DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, APP_ENCRYPTION_KEY, CRON_SECRET, XAI_API_KEY and ANTHROPIC_API_KEY. This does not establish whether remote environments or ignored local files contain credentials.

Connected Vercel lists two accessible teams. Target staging team question is pending; no cloud resource has been created. Production release/domain change requires separate approval.

## Readiness/migration slice
Worker backend_readiness reports 18 focused tests, typecheck/lint, ordinary production build all exit0. Production preview GET readiness/auth without credentials returned503/no-store safe reason codes; preview stopped. Concurrent two migrators plus repeat on separate disposable DB succeeded with8 migrations recorded; DB dropped. Report .superpowers/sdd/2026-10-01-public-completion/backend-task-1-report.md. Independent review pending. Static integration gate pending.

## Task 3 local acceptance update — 2026-10-02

The earlier remaining-local-acceptance list is superseded by `.superpowers/sdd/2026-10-01-public-completion/backend-acceptance-report.md` for this run. The guarded actual-application/PostgreSQL/Chromium acceptance command passed (exit 0, one serial scenario, 24.7 seconds), covering fresh/repeat/concurrent migrations, seeded upgrade, failed migration rollback/recovery, two browser accounts, virtual WebAuthn, profile bounds, current-DB expiry/revocation, note/consent/audit isolation, real browser inquiries and rate refusal, synthetic sealed audit operations, application restart persistence, seeded dump/restore matching all 14 public tables, late purge failure/retry, account cascade and bystander preservation.

The harness uses only fresh `quesar_task3_<random>` databases on the parent's loopback PostgreSQL 17 server and removes those databases; parent databases and server ownership were preserved. No real provider, physical passkey, remote database, deployment or staging identity is qualified. The provider-free model refusal is real; sealed audit payloads and provider identity assertions are synthetic fixtures.

Reproduced/fixed: server name bounds, immediate app/native auth/passkey-operation expiry/revocation (session cookie caching disabled globally), verified Google/Apple OAuth admission, local purge statement atomicity and honest partial-failure copy, and redaction at touched inquiry/console log sites. Provider revocation/token cleanup and later auth deletion remain separate operations.

Historical provider rows have no stored verification provenance: a seeded legacy unverified Google link can still gain admin through a password session when allowlisted. The new OAuth gate does not retroactively revalidate it; legitimate verified explicit links can also retain a false local emailVerified flag. No destructive migration or admin-policy rewrite was made. An existing-database production upgrade remains Blocked until actual historical provider rows undergo operator review/reverification or an independently reviewed provenance migration. Fresh isolated staging can proceed after verifying absence of legacy rows; real provider and deployment acceptance remain unverified. See the Task 3 report for exact commands, fixture boundaries and final gates.

Final Task 3 gate receipts (2026-10-02): root `bun run check` exit 0, 75 files / 596 tests; `build:static` exit 0; `check:static` exit 0, 129 HTML pages; `test:e2e` exit 0, 181 passed (3.2 minutes). The separate guarded backend harness passed one complete serial scenario (24.7 seconds). Reports distinguish these local/virtual/synthetic results from live provider or production acceptance. Implementation is frozen pending independent review.

## Task 3 review fix round 1 — 2026-10-02

Independent review R1 reproduced teardown hanging after an already signal-exited owned app. The harness now recognizes normal and signal exits, bounds SIGTERM/SIGKILL waits, and attempts all remaining cleanup if one action fails. Six cleanup regressions passed. Current format/type/lint/root test chain exited 0: **76 files / 602 tests**. The guarded actual app/Postgres/browser suite exited 0: **1 passed / 25.1 seconds total**, including deliberate owned Vite SIGKILL before teardown and completed pool/database/seeded-scratch cleanup. No owned databases remained; parent databases/server were preserved.

Two failed attempts and their completed cleanup remain recorded in `.superpowers/sdd/2026-10-01-public-completion/backend-task3-fix1-report.md`: isolated profile navigation failure with unproven cause, then SIGTERM yielding Vite normal exit(143) instead of a signal exit. The final fault injection uses SIGKILL and keeps strict assertions. Only three harness/test sources changed; product hashes and prior production/static receipts retain their scope. The 20-source manifest is frozen for independent re-review; no live-provider/staging/production acceptance is implied.
