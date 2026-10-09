# Task 4 qualification — 2026-10-09

## Implemented

- `e2e/backend/durable.acceptance.ts` compares both repeat/fresh and concurrent migration registries against the exact discovered regular root `migrations/*.sql` filenames. Current set contains nine, including `0009_oauth_verification.sql`. Upgrade, rollback/recovery, nested exclusion and concurrency assertions remain.
- Added `e2e/backend/persistent.acceptance.ts` and `persistent.config.ts`: opt-in guarded acceptance of the actual `.output/server/index.mjs` produced by `build:persistent`. No service source/security policy edits or dependencies.
- Owned ephemeral loopback Node listener and HTTPS proxy with generated scratch certificate; Chromium certificate exception only in these owned contexts. Production HTTPS origin requirements and `__Host-` secure/HTTP-only cookies remain enforced. Child environment is an allowlist with generated keys, no inherited provider credentials and deliberately no `NODE_ENV`; local passwordless role is queried from the authorized parent and explicitly passed as `PGUSER`.

## Commands / verified receipts

All commands ran in `/Users/donaldfilimon/dev/active/quesar.cloud`. Harnesses were serial, after root released Vite ownership. Harness command prefix: `QUESAR_BACKEND_ACCEPTANCE=1 QUESAR_ACCEPTANCE_ADMIN_URL=postgresql://127.0.0.1:55471/postgres`.

| Command | Exit | Evidence |
| --- | --- | --- |
| `bunx playwright test -c e2e/backend/playwright.config.ts` | 0 | 1 passed, 25.7s; exact nine root migrations, fresh concurrent migrators 0/0; seeded earlier-schema upgrade, failure rollback/recovery/nested exclusion; real browser durable account/profile/consent/contact, virtual WebAuthn, encrypted audit isolation/receipts, expiry/revocation/deletion, app restart; seeded dump/restore 0/0 and all 15 public tables equal; signal-exited app teardown completes |
| `bunx playwright test -c e2e/backend/ai-consent.config.ts` | 0 | 1 passed, 1.1m; five reachable routes, synthetic provider success/failure/timeout, stale/withdrawn consent prevents outbound, SQL fault withholds reply, restart, missing-key and providerless refusal, isolation and cleanup |
| `bunx playwright test -c e2e/backend/commerce.config.ts` | 0 | 6 passed, 25.7s; actual existing sibling WDBX executable reused unchanged, invoice create/replay/money bounds, anonymous/bystander refusal, password-only admin denial then trusted synthetic linked-identity settlement/replay, backend replacement, account deletion and same-email replacement isolation |
| `env -i PATH="$PATH" VITE_STATIC_SITE=false VITE_AUTH_ENABLED=true DATABASE_URL='' BETTER_AUTH_SECRET='' BETTER_AUTH_URL='' APP_ENCRYPTION_KEY='' GITHUB_TOKEN='' bun run build:persistent` | 0 | Actual persistent Node artifact generated; bundler emits existing module-directive warnings |
| `bun run typecheck` | 0 | Root TypeScript scope, including new helper; root owns final gate |
| `bunx eslint e2e/backend/durable.acceptance.ts e2e/backend/persistent.acceptance.ts e2e/backend/persistent.config.ts --max-warnings 0` | 0 | Focused lint |
| `bunx prettier --check e2e/backend/durable.acceptance.ts e2e/backend/persistent.acceptance.ts e2e/backend/persistent.config.ts` | 0 | Focused formatting |

`bunx playwright test -c e2e/backend/persistent.config.ts` with the guarded prefix: **exit 0, 1 passed (27.0s)**. Final receipt includes compiled HTTPS secure sessions, owner decrypt, known foreign audit-ID `not_found` refusal, transplanted ciphertext refusal, restart, seeded 15-table restore equality and restored app session/decryption. Owned cleanup completed.

## Persistent artifact proof and limits

The actual artifact, without `NODE_ENV`, refuses missing required DB/session/origin configuration with readiness/auth 503. A syntactically valid disconnected database still yields configuration readiness 200, while direct SQL and real auth prove connectivity failure; readiness makes no connectivity claim. Startup against an empty real database does not implicitly migrate. Explicit/repeat migration applies exact nine root filenames.

The owned HTTPS flow registers two actual accounts, verifies secure HTTP-only session cookies, consumes seeded notes through compiled Console functions with account isolation, decrypts the owner's sealed synthetic audit and refuses transplanted AAD-bound ciphertext. Stable keys/session/data survive process replacement. With the Node app stopped, seeded `pg_dump`/`pg_restore` exit 0/0 and all 15 public table row hashes match; the restored Node app accepts the existing secure session and decrypts the restored audit.

Data/audit records are explicitly synthetic SQL fixtures; this does not imply a live provider-generated audit. No physical WebAuthn hardware, remote deployment, public certificate/TLS termination, production backup retention/restore ops, live payment provider/settlement, or complete production commerce acceptance is claimed. Browser flows in persistent qualification block non-owned origins; the certificate exception does not qualify public TLS.

Initial artifact signup correctly failed 500 because the credential-free child lacked the PostgreSQL default username normally obtained from `USER`; bounded redacted diagnostics identified it. The fixture now explicitly passes the authorized parent's local role. Additional foreign-ID transport probes first met the unchanged CSRF guard when Playwright interception removed Fetch-Metadata; the final browser probe retains normal same-origin metadata and the compiled server-function header. No production guard was relaxed.

## Cleanup and ownership

All harness afterAll paths stop only owned spawn handles, close pools, drop only fresh per-run named databases, and remove owned scratch/cert/dump/native ledger directories. Persistent failure paths also completed cleanup. Parent PostgreSQL belongs to root and remains running; unrelated listeners are not signaled. No commits, dependency additions, sibling mutations, secret reads or remote/provider calls were made. `.output/` remains generated persistent build output for root review.

Logs: `/Users/donaldfilimon/Documents/Codex/2026-10-09/new-chat-2/work/task4/`: `durable.log`, `ai-consent.log`, `commerce.log`, `build-persistent.log`, `persistent.log`, `persistent-debug.log`, `foreign-debug.log`, `typecheck.log`, `lint.log`, `format.log`. Debug logs contain only bounded/redacted owned synthetic fixture diagnostics.

## Bounded reviewer follow-up — P3 F1

Only `persistent.acceptance.ts` changed. Direct observation of the owned generated Node artifact established its real stdout receipt: `➜ Listening on: http://127.0.0.1:<port>/`. Startup now captures bounded stdout and verifies that owned child's exact-port receipt before making HTTP readiness requests; spawn errors, process exits and explicit bind failures reject. The disconnected PostgreSQL probe now retains an owned loopback TCP listener that destroys every incoming socket for the entire probe. It cannot be replaced by an unrelated listener during the check and closes in `finally`, after stopping the referring child and closing its pool.

- Guarded `bunx playwright test -c e2e/backend/persistent.config.ts`: exit 0, **1 passed (29.6s)**; actual existing artifact used without rebuilding. All prior config/migration/session/isolation/restart/15-table restore proofs and owned cleanup passed.
- `bunx eslint e2e/backend/persistent.acceptance.ts --max-warnings 0`: exit 0.
- `bun run typecheck`: exit 0.
- Formatter applied to the owned helper; no production, public CSS, service source, dependencies or sibling code changed. Source frozen after receipts; root owns final gates.

Follow-up logs: `persistent-ownership.log`, `lint-ownership.log`, `typecheck-ownership.log` under the same Task 4 workspace log directory. Actual successful helper teardown stopped its Node artifact/TLS proxy and removed its owned databases/scratch; root's parent PostgreSQL remains outside helper lifecycle.
