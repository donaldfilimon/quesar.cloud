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

## Qualification findings — 2026-10-02

Task3 actual installed Better Auth/native routes required global cookie-cache disabling for immediate session revocation; direct provider provisioning/link/returning admission now requires verified Google/Apple assertions. Historical provider rows have no verification provenance. Existing-database production cutover remains Blocked pending actual identity review/reverification or an independently reviewed provenance migration; a fresh isolated staging database must verify absence of legacy rows. Local column backfill does not establish provider verification.

### Required Task2 continuation: generation lifecycle

The approved plan requires cancellation and restart recovery as well as authenticated transport. Security pairing/preview completion does not qualify these missing behaviors. Inspect and implement the service engine/server/startup/shared protocol and client together: authenticated cancellation, bounded work using the installed SDK contract, signal propagation, job-generation binding, exactly-once terminal events, and deterministic persisted generating-to-interrupted recovery. Preserve partial projects and explicit retry; never claim cancellation rolls back written files. Retain operator-owned execution and paired protected preview.

Use actual service requests and real Next previews to qualify the lifecycle, alongside adversarial unit fixtures. Required live generation/edit remains Blocked until provider availability changes: two bounded actual SDK probes returned400invalid_request_error with billing/credit/balance terms. These were failed provider operations, despite caught-error shell exit0. No billing purchase or secret disclosure occurred. Do not substitute mocks for provider acceptance or repeatedly probe unchanged billing state.

A detailed current dispatch is `.superpowers/sdd/2026-10-01-public-completion/quasar-generation-lifecycle-brief.md`; the approved objective is unchanged. Independent specification/quality/security review follows implementation; no production dependencies, commits or publication are authorized by this supplement.

## 2026-10-02 required AI consent coverage continuation
Source preflight reproduced reachable persona and dashboard requests calling the provider directly outside console consent/encryption/audit admission. The approved AI-consent and client-workflow requirement applies to these website model actions too. Reuse shared audited server admission, preserve trusted persona/desk prompts and offline catalog behavior, adopt shared policy controls on Abbey bot, workspace and dashboard, disclose transmitted document context, and qualify refusals before provider plus sealed owner audit receipt/expiry/deletion. Separate operator-owned paired Quasar generation remains its own explicit service contract. Detailed bounded brief: `.superpowers/sdd/2026-10-01-public-completion/ai-consent-coverage-brief.md`; source evidence in adjacent preflight. Not implemented or accepted yet.
