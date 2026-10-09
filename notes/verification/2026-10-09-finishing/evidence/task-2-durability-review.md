# Task 2 durability review — 2026-10-09

Verdict: **Spec Partial; quality changes requested.** The real permission-fault child qualifies terminal persistence rejection, retained mutation/home fences, interrupted restart recovery, and retry admission. The held-mutex test checks durable finalization and subsequent retry, but its event-pending assertion does not independently qualify publication ordering.

Scope: newly added tests at `sidecars/quasar-service/src/job.test.ts:91` and `sidecars/quasar-service/src/server.test.ts:770`, plus the harness injection. Previously accepted handler-drain/construction/deletion changes were read as context, not re-reviewed as new task scope. No production edits, new seams, dependencies, test reruns, commits, or external actions.

## Findings

### D1 — Event response blockage masks premature terminal publication

- **Severity:** P2
- **File:line:** `sidecars/quasar-service/src/server.test.ts:798`
- **Description:** The test starts the events request while the preview reservation holds `withRegistryLock`, then asserts that the request remains pending. `getEvents` itself acquires that mutex (`server.ts:304`). Consequently this assertion would remain true even if `bus.emit(done)` moved before `await finalizeJob(...)`. Once the lock releases, finalization was enqueued before the events request; its durable row can settle before the request reads either the feed or job. Thus the done/idle assertions afterward also cannot distinguish premature publication. The existing production ordering is correct by inspection (`server.ts:197-199`); the claimed regression proof is weaker than the report states.
- **Suggestion:** Narrow the report to mutex serialization and HTTP-visible settled-state consistency. For direct publication regression proof, use an available observable path that does not acquire this lock, or separately qualify that invariant with an appropriate existing event-level test; do not add a production seam contrary to this task. Explicitly acknowledge the endpoint barrier masks early internal publication if no such path exists.
- **Status:** Open; qualification/report correction required.

### D2 — Held request rejection is observed too late

- **Severity:** P2
- **File:line:** `sidecars/quasar-service/src/server.test.ts:791`
- **Description:** The `preview` promise has no rejection handler until `Promise.allSettled` in the final cleanup (`:810`). If the preview request rejects before lock-entry observation, or after lock release while events/body/disk assertions are running, it can trigger an unhandled rejection before cleanup attaches its observer. The events promise similarly initially has only a fulfillment handler (`:798`), leaving rejection unobserved during the following sleep. This violates the requested observe-all-promises-on-errors discipline and can cause a test-runner failure beyond the intended assertion.
- **Suggestion:** Attach rejection observation immediately to each started request while retaining the original promise for bounded settlement and meaningful outcome assertions. Keep unconditional engine and lock releases.
- **Status:** Open; fixture correction required.

## Verified by source inspection

- Permission fault occurs after real scaffold/admission and before terminal completion. `0500` prevents the actual registry temporary-file write on an ordinary non-root host; the expected diagnostic is asserted exactly after reaping. The test does not silently skip unsupported permission behavior.
- Persisted generating state, absence of done, edit 409, rejected shutdown, and retained home ownership are asserted. The child is individually owned through its `Bun.spawn` handle and killed/reaped before same-home restart. Parent and child cleanup restore permissions; parent cleanup nests reaping, reader release, retry shutdown and home removal so earlier exceptions do not bypass later stages.
- The permission child is the containment boundary for its internally unbounded fetch/shutdown operations: the parent's receipt wait expires and cleanup kills that child. The child completion rejection is observed by production code. The parent uses bounded receipt/exit/diagnostic/recovery/admission/shutdown waits.
- The allocation injection already exists in production and really runs inside the registry mutex. Its held gate and the engine gate release in `finally`; both requests are included in cleanup settlement.
- Bounds use `Promise.race`, which observes rejection but does not cancel underlying requests. The server test's shared existing `afterEach` shutdown is not independently bounded. These fixtures are bounded waits, not a universal guarantee against a hung runtime or filesystem.

## Evidence and limits

The report records focused tests exit 0 (2 pass), full sidecar test exit 0 (111 pass, 470 assertions), typecheck exit 0, and scoped diff check exit 0. Those are implementer-reported evidence, not independently rerun in this review. Review shell reads exited 0 except a combined instruction-file discovery command exited 1 because no nested instruction files matched; no validation gate was executed here.

This fixture delays mutex acquisition, not an in-progress filesystem write. Neither fixture establishes behavior for a crash between durable commit and event publication, power-loss durability/fsync, arbitrary disk faults, cross-host ownership, providers, remote preview DNS/TLS, or deployment. R4 may be Current for the controlled permission-failure/restart surface; publication-order qualification remains Partial as described in D1.
