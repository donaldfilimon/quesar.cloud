# Staging qualification and release boundary

Prepared 2026-10-02. This runbook is not authorization to provision, configure
secrets, migrate a shared database, deploy, call paid providers, or cut over.
The current site remains GitHub Pages. A local green gate is not staged service
acceptance.

## Required authorization before any remote write

Record the confirmed Vercel team, project, isolated staging origin, database
owner and disposable staging database, provider identities, spend ceiling,
callback URLs, and who can approve release/rollback. The existing staging
preflight records leave team/project selection unanswered. Do not choose one
implicitly, reuse another application's deployment, or upload an arbitrary
remote main revision as this uncommitted checkout.

Record variable names and configuration status only, never values. Follow
`secrets-checklist.md` for the required database/session/origin/encryption
configuration and optional providers. No secret-store scanning is needed.

## Local qualification before staging

1. Record source revision and full dirty diff. Run `bun run check`, then
   `bun run build:static`, `bun run check:static`, `bun run test:e2e`.
   These do not authorize publication.
2. Independently run `bun run typecheck` and `bun run test` in
   `sidecars/quasar-service`. Root TypeScript and lint exclude the sidecar.
3. Review the generation lifecycle, actual SDK SSE fixtures, filesystem drain
   and deletion races, process ownership and restart/shutdown evidence. Keep
   mock engine tests separate from provider-backed receipts.
4. Review migration `0009_oauth_verification.sql`: it deliberately inserts no
   historical verification evidence. Verify synthetic unknown, wrong-subject,
   verified-link and returning-sign-in fixtures. Unknown historical links can
   sign in, but cannot authorize admin until exact-subject re-verification.
5. Film timing/encoding/browser receipts live separately from human listening
   approval. Do not label exports accepted or publish download controls before
   final audio, subtitle and frame review. Keep original teasers/WebM sources
   until reviewed replacements are available.

## Explicit release sequence after staging authorization

1. Create or select only the approved isolated staging resources. Configure
   staging-specific auth/OAuth callbacks and keys. No production data import
   unless separately approved.
2. Snapshot/backup the approved staging database and record a restore test.
   Run `bun run db:migrate` **only** with the approved staging `DATABASE_URL`.
   Ordinary builds must not run migrations. Verify migration ledger, repeat
   application and advisory-lock behavior before deployment.
3. Deploy the reviewed source/build to the approved staging project. Record
   immutable deployment ID, source hashes, origin and readiness response.
   Missing or malformed required runtime configuration must refuse sensitive
   routes, not fall back to an apparently durable in-memory database.
4. Use explicitly authorized synthetic staging identities for browser sign-up,
   revocation, profile/account deletion, consent withdrawal, audit expiry,
   inquiry rate limits, cross-user isolation and passkeys. Real Google/Apple/X
   callbacks require their owners' authorization; mock assertions are not live
   verification. Fresh staging must have no unexplained historical provenance.
5. Verify encryption/key-rotation and sealed audit/workspace records without
   logging plaintext or tokens. Confirm cron authorization and expiry receipts.
   Exercise optional not-configured states before enabling paid model actions.
6. Quasar stays operator-owned outside Vercel. Use a disposable approved
   `QUASAR_HOME` on one host. Pair only the approved exact browser origin.
   Run a real generation, inspect files, explicitly edit, start the protected
   preview, verify HTML/assets/HMR, cancel by the returned job UUID, restart and
   inspect retained partial files. Confirm another site's preview remains live.
   Record sanitized request count, terminal outcome and timing, not credentials
   or raw provider errors. The previous provider billing refusal remains Blocked
   until its state changes; do not retry it unchanged or purchase credits.

## Cutover and rollback

Production cutover requires separate approval after staging receipts and
independent specification/security review. Save the current static release and
deployment IDs, DNS/callback configuration and database backup reference.
An additive migration cannot be rolled back by restoring only old code.
Rollback must retain provenance evidence and never restore the old provider-name
admin rule. Refuse unknown links rather than manufacturing verification rows.
Account/data deletion and uncertain provider writes are not undone by deploying
an older binary. Explicitly reconcile those effects before restoring a backup.

## Current external blockers

- Staging team/project/database/identity authorization remains unconfirmed.
- The recorded Anthropic billing/credit refusal blocks actual generation/edit
  acceptance. No live retry or paid call is authorized by this runbook.
- Human listening and independent film/security acceptance require explicit
  receipts; encoding or a passing local unit suite does not substitute for them.
