# Task 5 independent specification and quality review

Date: 2026-10-09

Verdict: **Approved for the assigned documentation scope.** No actionable specification or correctness errors found in the frozen Task 5 diff. This approves a proposed operating checklist, not a deployed service or completed staging acceptance.

## Scope and evidence

Read the Task 5 brief, report and complete review diff; repository AGENTS/CLAUDE; persistent-server, staging-qualification and native capacity documentation; both Task 4 reports. Cross-checked actual package scripts, migration implementation, configuration-readiness implementation, auth cookie declarations, cron handler and configured cadence. No tests, builds, native operations, remote requests or service changes were run by this reviewer. Existing Task 4 exit codes and timings below are report evidence, not independently rerun checks.

## Findings

No blocking findings. No source changes proposed or made.

## Specification coverage

| Severity | File:line | Description | Suggestion | Status |
| --- | --- | --- | --- | --- |
| Informational | notes/deploy/persistent-node-staging.md:10 | Target authorization and immutable source/dirty-diff/artifact/native/migration references are required without selecting a host. | Complete the target record before executing host operations. | Current document; operational record pending |
| Informational | notes/deploy/persistent-node-staging.md:29 | Node/Bun contracts, loopback binding, private environment and restrictive store/config/key permissions are accurate; PostgreSQL, WDBX and Quasar ownership and single-writer constraints are explicit. | Retain the documented separation during host provisioning. | Satisfied |
| Informational | notes/deploy/persistent-node-staging.md:67 | Release sequence preserves an immutable persistent artifact after root gates; traffic/jobs stop, requests and native writers drain, coherent paired backups restore before explicit reviewed SQL migrations and supervised start. No invented host manager or WDBX restore commands. | Record and rehearse host-specific drain/start/stop commands after host selection. | Satisfied; host rehearsal pending |
| Informational | notes/deploy/persistent-node-staging.md:101 | HTTPS/public TLS, auth origin/cookies/passkeys, proxy trust and CSRF acceptance remain explicit checks. Existing report-only CSP is preserved. | Obtain actual public proxy/TLS/browser receipts on the approved host. | Satisfied; remote acceptance pending |
| Informational | notes/deploy/persistent-node-staging.md:118 | Readiness is correctly limited to configuration shape, with separate SQL/schema/native/browser checks and capacity/health alerts. | Do not use readiness 200 as durable-service acceptance. | Satisfied |
| Informational | notes/deploy/persistent-node-staging.md:140 | Private logging and secret/header/record redaction are operating requirements, not a claim that current runtime logs already satisfy them. The current expiry handler logs caught raw errors at src/routes/api/cron/audits-expire.ts:24. | Retain the specified synthetic-failure redaction acceptance gate; assess the selected sink and actual application output before admitting staging traffic. | Operational prerequisite; outside this documentation task |
| Informational | notes/deploy/persistent-node-staging.md:148 | External scheduler, protected Bearer header, timezone, daily cadence, serialization, retry bounds and endpoint refusal statuses match the declared route. | Provision the same approved CRON_SECRET to application and scheduler through private facilities; verify failure and overdue-run alerts. | Satisfied; scheduler unselected |
| Informational | notes/deploy/persistent-node-staging.md:163 | Rollback distinguishes compatible artifact reversal from paired data restoration, preserves keys/config, and requires reconciliation of deletion/provider effects; code reversal cannot undo migration/native writes. | Rehearse rollback on isolated targets before release. | Satisfied; host rehearsal pending |

## Evidence boundaries

- Task 4 reports compiled Node HTTPS sessions/secure cookies, audit decryption/isolation, restart and PostgreSQL dump/restore equality across 15 tables; final ownership rerun reports exit 0, one case in 29.6 seconds.
- Separate native report records Vite plus actual native executable paired quiescent restore: seven commerce cases in 1.6 minutes, SQL/native tree/config/key equality, retained sessions, invoice states and replay. It is not compiled Node commerce acceptance. The independent foreign-cancel control strengthening remains root/backend-worker work and is not treated as newly verified here.
- Remote host/public TLS, live OAuth/provider/payment, production key escrow, online backup, power-loss/crash/corruption recovery, external rollback attestation, physical passkeys, historical provenance and full-film listening remain explicitly unqualified.

Review modified only this review record. No commits, dependency changes or source fixes.
