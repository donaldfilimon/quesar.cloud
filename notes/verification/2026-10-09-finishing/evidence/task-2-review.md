# Task 2 independent spec and quality review

Reviewed 2026-10-09 against baseline `8c61884c`, the task brief, frozen `task-2-review.diff`, current affected source and cross-cutting `job.ts`, `ownership.ts`, `preview-proxy.ts`, and `index.ts`. Review ownership: this notes file only. No code changes, test reruns, dependencies, external calls, or Git mutations.

## Verdict

**Spec compliance: Pass for the implemented bounded slice; overall qualification remains Partial.** The handler fence is synchronous before any await, registers every admitted handler, and resolves its drain token in `finally`. Shutdown closes admission before snapshotting handlers, drains admitted mutations before job/preview cleanup, and releases home ownership last. Existing job/preview admission checks still prevent delayed bodies from admitting new jobs after closing. Authentication, host/origin checks and protected preview behavior remain intact. Historical reconciliation appropriately separates current source, local fixtures, remote/runtime unknowns, and out-of-scope findings. Its explicit durability, installer and delayed-body proof gaps prevent a full historical-closure verdict.

**Quality: Changes requested for failure-path fixture cleanup.** No production correctness defect established in this diff. One actionable test reliability issue below should be corrected before treating the new regressions as robust diagnostics.

## Findings

### Q1 — Held fixture gates need unconditional release

- **Severity:** P2 (test reliability).
- **File:line:** `sidecars/quasar-service/src/server.test.ts:688` and `sidecars/quasar-service/src/server.test.ts:733`; gates are released only at lines 691 and 735.
- **Description:** An assertion failure before `resume()` leaves an admitted delete or accepted filesystem write waiting forever on the fixture's `held` promise. `afterEach` awaits `server.shutdown()` (line 86), which now correctly drains these operations indefinitely; cancellation cannot settle the held accepted write. In the delete test, the replacement `preview.stop` also remains held. Consequently precisely the regression these tests are meant to detect can produce cleanup timeouts, retain the listener/home owner, and contaminate later tests instead of yielding a clean isolated failure. This is established from control flow; no failing-run reproduction was performed.
- **Suggestion:** Wrap the assertions and outstanding request/shutdown promises in `try/finally`; always resolve the held gate, restore `preview.stop` after the admitted call settles, and await/observe outstanding request/shutdown promises during cleanup. Also put the standalone retry server in the occupied-bind test (`server.test.ts:714-716`) under `finally`, since the health assertion currently bypasses its shutdown on failure.
- **Status:** Open. No implementation edits made by reviewer.

## Evidence and limitations

- Reported final sidecar gate: `bun run typecheck` exit 0; `bun run test` exit 0, 109 pass / 0 fail, 455 assertions in 14 files, 22.61 seconds; scoped `git diff --check` exit 0. These are worker receipts read from `task-2-report.md`, not independently rerun results.
- Read-only inspection commands completed with exit 0. No concrete runtime doubt warranted another test run under the review brief.
- Hanging admitted handlers intentionally retain ownership; `index.ts:20-28` supplies the standalone 15-second forced process exit. This is an explicit policy with recovery on restart, not an early release defect. Proxy fetches may remain pending before upstream headers; draining all handlers can therefore delay graceful shutdown, as already acknowledged by the report.
- Handler tracking ends when its Response is returned, not when streamed response bodies complete. Current preview response streaming does not write the registry or site files through this service, and shutdown still stops previews and the server before releasing home; no ownership violation established from this distinction.
- Failed terminal persistence, failed startup recovery, installer cancellation/hangs and deployed DNS/TLS/provider behavior remain unqualified. Existing code presence and historical fault labels are not fresh runtime proof.
