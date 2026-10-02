# Backend Qualification Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development. No commits unless separately authorized.

**Goal:** Durable staged app and secure operator-owned generation.
**Architecture:** Retain app/auth/DB services; enforce runtime readiness; authenticated local sidecar.
**Tech Stack:** Better Auth, Postgres, Bun, TanStack Start, Vercel/Neon.
**Spec:** notes/superpowers/specs/2026-10-01-site-completion-design.md

## Global Constraints
No secrets in logs, no shared DB migration during build, user isolation and admin rule unchanged. No new production dependency/commits. Confirm cloud identity before provisioning; production cutover requires release approval. Implementers never spawn agents.

## Review Focus
Static prerender with production env; request middleware CSRF ordering; missing/malformed keys; hostile origins to local sidecar; restart recovery.

### Task 1: Runtime readiness and migration separation
Files: src/lib/server readiness module, src/start.ts, auth/server.ts, db.ts, package.json, vercel.json as required, scripts/migrate.ts and tests.
- [ ] Test production invalid/missing DB/session/origin, optional config and static/development exceptions.
- [ ] Enforce readiness before serving sensitive runtime; keep CSRF first. Readiness endpoint returns safe reasons only. Remove migrations from ordinary build and document explicit release command.
- [ ] Run focused tests/typecheck/lint; review.

### Task 2: Secure Quasar pairing
Files: sidecars/quasar-service/src/shared, src/lib/quasar client and settings, service tests.
- [ ] Test token requirement for all operations, origin whitelist/preflight, loopback defaults and explicit network opt-in; protect previews and WebSocket upgrades.
- [ ] Implement operator-generated pairing token with narrow origin policy; browser device credential storage explicit and clearable, never in URLs/logs.
- [ ] Add recovery/cancellation tests and service typecheck/tests; review.

### Task 3: Database and account/workflow acceptance
Files: isolated integration harness, existing account/workspace/console tests, notes/verification/backend-acceptance.md.
- [ ] Disposable Postgres migrations install/upgrade/repeat/concurrency/restart and cross-user isolation.
- [ ] Real browser account and consent/inquiry journeys; provider-backed OAuth/passkey/LLM and Quasar generation only with authorized credentials.
- [ ] Fix real gaps through reviewed tasks; keep unavailable provider acceptance Blocked.

### Task 4: Staging and cutover preparation
Files: notes/deploy staging runbook and acceptance receipts; readiness/logging modules.
- [ ] Confirm target team/project, provision authorized staging, configure isolated Postgres/keys/callbacks and deploy.
- [ ] Verify provider journeys, expiry, safe logging and backup/restore with direct receipts.
- [ ] Record exact cutover/rollback and request production release approval only after implementation and staging acceptance. Never silently lower live acceptance.

## Preflight corrections (binding)
- Runtime readiness follows CSRF and precedes eager DB/auth imports. Build/static succeeds without credentials and never migrates DB. Test incoming requests, malformed DB/origin, auth-disabled durable DB and encryption/key failures.
- Migrator holds a Postgres advisory lock on its same connection across discovering/applying/recording migrations; concurrent runs both succeed. Release: migrate, verify schema, deploy; acknowledge irreversible schema changes in rollback docs.
- Secure preview task owns preview.ts, index.ts, browser preview UI and templates config as needed, not just API server. Bind preview children loopback and serve rendered content/assets/HMR through authenticated transport. Tokens never appear in URLs. Prefer user-initiated top-level preview session if cross-site iframe cookies cannot be supported reliably; document behavior and test revoked/expired sessions, hostile origins, unauthenticated content and upgrades.
