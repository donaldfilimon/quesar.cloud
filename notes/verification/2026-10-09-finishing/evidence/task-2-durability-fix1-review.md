# Task 2 durability review fix round 1 — 2026-10-09

**Implementer follow-up disposition:** controlled direct success/error ordering is now independently observed from the events HTTP mutex by `publication.test.ts`; see [closure evidence](publication-order-closure.md). This does not retroactively claim this reviewer inspected or reran the new test. Original D1/D2 review and deeper fault limits below remain historical.

Verdict: **Quality approved for the scoped D1/D2 corrections. Spec approved for controlled permission-failure/recovery and HTTP consistency qualification; direct internal publication-order proof remains Partial.** No new actionable findings in this scoped re-review.

## Dispositions

### D1 — Event response blockage masks premature terminal publication

- **Severity:** P2 (original finding)
- **File:line:** `sidecars/quasar-service/src/server.test.ts:773`, `:801`
- **Description:** The renamed test now describes registry mutex serialization and HTTP-visible settled state. The source comment explicitly states that pending HTTP does not prove internal bus publication order. The report's status and proof boundaries make the same limitation explicit, including that an early bus emit could pass these observations.
- **Suggestion:** Preserve this boundary in downstream completion/R4 records. Direct internal publication ordering remains source-inspected rather than independently qualified by this fixture.
- **Status:** Resolved by accurate claim/scope correction; the underlying direct-ordering proof gap remains Partial by design.

### D2 — Held request rejection is observed too late

- **Severity:** P2 (original finding)
- **File:line:** `sidecars/quasar-service/src/server.test.ts:795`, `:805`
- **Description:** Immediate rejection observers are now attached to preview and events promises. The original promises remain available for bounded awaits and cleanup settlement. Equivalent observers were added to the existing held deletion/shutdown fixtures. Engine and lock release paths remain unconditional.
- **Suggestion:** None for this scoped correction.
- **Status:** Resolved.

## Evidence and limits

Read the latest `task-2-durability-fix1-review.diff`, report, and current test source. No production seam, dependency, or protocol change was introduced by these fixes. No tests were rerun during review. The frozen report records focused validation exit 0 (4 pass, 24 assertions), typecheck exit 0, scoped diff check exit 0, and full sidecar exit 0 (111 pass, 470 assertions). These are reported gate receipts, not independent review executions.

Previous review's permission restoration, owned-child termination/reaping, retained ownership/fence and restart assertions remain accepted. This test holds a registry mutex, not an in-progress filesystem write. Crash between durable commit and publication, power-loss durability, arbitrary storage faults, providers and remote/deployment behavior remain unqualified. Existing shared afterEach cleanup and non-cancelling Promise.race bounds retain the limitations documented in the first review.
