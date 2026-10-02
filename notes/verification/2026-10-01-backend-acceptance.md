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
