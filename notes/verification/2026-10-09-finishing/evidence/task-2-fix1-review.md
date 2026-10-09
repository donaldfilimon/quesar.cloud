# Task 2 fix round 1 independent rereview

Date: 2026-10-09. Scope: original Q1, `task-2-fix1-review.diff`, current affected test lines, and appended validation receipts in `task-2-report.md`. Read-only source review; this notes file is the only write. No tests rerun.

## Verdict

**Q1 addressed. Spec compliance: Pass for the bounded task slice. Quality: Pass for this fix round; no new actionable finding established.** Overall lifecycle qualification remains Partial for the proof gaps already recorded in the original review/report.

## Finding disposition

- **Severity:** P2 (original test reliability finding).
- **File:line:** `sidecars/quasar-service/src/server.test.ts:697`, `sidecars/quasar-service/src/server.test.ts:747`, and `sidecars/quasar-service/src/server.test.ts:722`.
- **Description:** Held delete and accepted-write fixtures now release their gates unconditionally in `finally` and observe pending promises. The delete fixture restores the preview stop method after its outstanding work settles. The occupied-bind retry server is shut down in `finally` if the health assertion throws. Therefore assertion failures cited in Q1 no longer strand fixture-owned gates or bypass retry-server cleanup. The crash fixture also releases the stdout reader in cleanup and removes temporary state even if retry shutdown rejects (`job.test.ts:85-87`). Production handler admission/drain ordering is unchanged.
- **Suggestion:** None outstanding for Q1.
- **Status:** Addressed by source inspection. Assertion-failure injection was not run, so this is a verified control-flow assessment, not a separate runtime failure-path receipt.

## Validation boundary

The implementer reports sidecar `bun run typecheck` exit 0; focused tests exit 0, 35 pass / 0 fail / 214 assertions; full `bun run test` exit 0, 109 pass / 0 fail / 455 assertions across 14 files, 13.45 seconds; scoped `git diff --check` exit 0. These are attributed worker receipts, not reviewer reruns. No remote/provider behavior or unqualified historical matrices gain new proof from this cleanup fix.
