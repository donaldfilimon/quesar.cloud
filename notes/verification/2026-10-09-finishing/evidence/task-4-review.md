# Task 4 independent spec and quality review — 2026-10-09

## Verdict

**Spec: PASS for the assigned local qualification scope. Quality: APPROVE with one non-blocking reliability note.** No production implementation/security-policy changes occur in the reviewed diff. No blocker found in the migration assertion update, compiled artifact isolation, restart, or restore assertions.

## Scope and evidence

Read the task brief/report/review diff, all three changed files, shared guard and cleanup helper, production readiness/request middleware, migration script and sealing implementation. Inspected recorded build, persistent, durable, consent, commerce and focused-check logs. The live Task 4 source matches the supplied diff. Shared sidecar edits were excluded and preserved. No source fixes, suite reruns, commits, provider calls, or process signals were performed during review. Review file creation is the sole write.

Existing receipts support durable 1 passed, consent 1 passed, commerce 6 passed, persistent 1 passed. Task report records exit 0 for those commands and the build/typecheck/lint/format checks; these exit codes were not independently rerun by this reviewer. Build log shows successful compilation and persistent log shows 27.0s total, explicit nine-file migrations, secure compiled HTTPS flows, restart, 15-table equality, restored session/decryption and cleanup. Earlier debug failures also record cleanup. The complete root gate remains root-owned; no claim of independently green final gate is made here.

## Constraint assessment

- `e2e/backend/guard.ts:2`: guarded opt-in, exact loopback disposable PG port/database and passwordless URL; generated names isolate created/dropped databases.
- `e2e/backend/persistent.acceptance.ts:56`: actual `.output/server/index.mjs`, runtime environment allowlist, generated signing/encryption keys, explicit local role, no inherited provider credentials or NODE_ENV.
- `e2e/backend/persistent.acceptance.ts:155`: owned loopback HTTPS proxy and scratch certificate preserve Host/Origin and secure cookie behavior. Certificate exception remains scoped to two fixture browser contexts, with no production policy edits.
- `e2e/backend/persistent.acceptance.ts:210`: missing configuration fails readiness/auth; disconnected valid configuration reports readiness while direct SQL and actual signup fail. Schema is checked empty before explicit migration. Configuration and connectivity evidence remain distinct.
- `e2e/backend/durable.acceptance.ts:227` and `e2e/backend/persistent.acceptance.ts:260`: exact discovered regular root SQL filenames compared with ordered registry; existing nested-exclusion, upgrade, rollback and concurrency coverage remains.
- `e2e/backend/persistent.acceptance.ts:281`: actual signup/session cookies, compiled owner/bystander reads, explicit foreign-ID refusal and AAD transplantation failure; SQL fixtures are clearly labeled and not claimed as provider-created records.
- `e2e/backend/persistent.acceptance.ts:362`: stable session/note/decryption through owned process replacement; stopped-app seeded dump/restore exits asserted, all source public table row hashes compared, restored artifact consumes same session and decrypts.
- `e2e/backend/persistent.acceptance.ts:182`: aggregate cleanup continues after individual failure; only owned spawn handle/proxy/pools/database names/scratch targeted. No parent cluster or arbitrary listener is signaled. Abrupt worker/host termination is not qualified by these hook-based paths.
- `task-4-report.md:15` and `task-4-report.md:29`: Vite durable/consent/commerce results are separated from Node artifact session/isolation/restore results. Node commerce or live provider acceptance is not claimed.

## Findings

### F1 — Port selection and readiness do not establish listener ownership

- **Severity:** P3 / non-blocking local harness reliability
- **File:line:** `e2e/backend/persistent.acceptance.ts:45`, `e2e/backend/persistent.acceptance.ts:77`
- **Description:** The reservation closes before the artifact binds, and startup accepts any readiness 200/503 before confirming the spawned process actually acquired the port. Under a competing local listener, the helper can briefly attribute another process response to the artifact before its bind failure is delivered. Later assertions usually fail, so this is not evidence that the recorded successful run used an unrelated process. It does leave a narrow flaky ownership window during startup and the deliberately disconnected-port probe.
- **Suggestion:** Confirm the owned child bind before accepting HTTP readiness (for example, retain and validate its listening receipt and fail on bind errors), and retry a fresh port when ownership is lost. Reserve the deliberately unreachable probe port with an owned non-serving listener until the disconnected check completes. Keep teardown restricted to owned handles.
- **Status:** Open; recommendation, not a acceptance-scope blocker. No fix performed.

## Proof limits

Recorded local successful acceptance is Current evidence; public TLS termination, deployment, real provider audit creation, physical authenticator behavior, live payments, production backup operations and root final gate remain unqualified here. Synthetic bounded diagnostics inspected contain the expected local missing-role and CSRF failures; they do not expose real credentials. Full failure injection across every setup/teardown operation was not run.
