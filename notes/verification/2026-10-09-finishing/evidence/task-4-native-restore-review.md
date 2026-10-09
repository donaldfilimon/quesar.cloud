# Task 4 paired native restore review — 2026-10-09

## Verdict

**Spec: PARTIAL, one restore-scope proof gap. Quality: REQUEST CHANGES to one assertion.** The paired backup/restore implementation is coherent and the recorded successful run supports restoration of SQL/native contents, permissions, existing sessions and reads. No production bug or source change is alleged. Restored foreign-invoice cancellation isolation is not meaningfully proved by the current negative probe.

## Findings

### N1 — Paid-invoice rejection does not test restored caller scoping

- **Severity:** P2 / acceptance coverage and claim correctness.
- **File:line:** `e2e/backend/commerce.acceptance.ts:445`; underlying behavior `src/lib/server/commerce.server.ts:146`.
- **Description:** The bystander attempts cancellation of `paid.id`. Production cancellation rejects a paid invoice even for its actual owner using the exact same error. Removing the owner check would therefore leave this assertion passing. This proves paid-state rejection but cannot substantiate the restored foreign-operation refusal claimed at `e2e/backend/commerce.acceptance.ts:457` and in the report. Exact separate account lists do prove restored read isolation; that is a distinct check.
- **Suggestion:** Choose an owner's restored `awaiting_payment` invoice. Assert foreign cancellation refuses, assert owner inventory remains unchanged, then prove the original owner can cancel that same invoice through the restored app. Preserve the settled invoice separately for the unchanged operator replay check. Adjust the report only after the meaningful scope assertion passes.
- **Status:** Open. No code fixes or test reruns performed by reviewer.

## Verified source assessment

- `e2e/backend/commerce.acceptance.ts:331`: browser/HMR clients disconnect and owned app is stopped before copying or dumping; earlier native writes are awaited. This is valid quiescent local paired backup, not atomic online or crash/power-loss evidence.
- `e2e/backend/commerce.acceptance.ts:337`: original native directory/config/key copied into private scratch; explicit dump/restore exit statuses asserted; fresh named restore DB and native directory. No source store deletion occurs.
- `e2e/backend/commerce.acceptance.ts:370`: complete recursive file hashes and permission modes checked, symlinks refused, root invoice-directory mode and config/key hashes/modes separately verified. Key bytes are not printed.
- `e2e/backend/commerce.acceptance.ts:408`: all 15 source public table row hashes compared with restored SQL, pool ended in finally.
- `e2e/backend/commerce.acceptance.ts:424`: old pool closed, shared connection URL and query pool switched to restore DB, native/config/key paths switched to restore tree before app restart. Subsequent signup/deletion queries therefore target the restored identity store.
- `e2e/backend/commerce.acceptance.ts:430`: actual owner/operator sessions resolve the original IDs; restored native owner/bystander inventories match; same synthetic operator replays the paid receipt. Stable fixture signing/encryption keys are re-provided, not recovered from production escrow.
- `e2e/backend/commerce.acceptance.ts:474`: real restored account deletion/replacement verified, old native receipt WALs retained, bystander prior/new orders preserved with exact count and contents.
- `e2e/backend/commerce.acceptance.ts:210`: existing aggregate cleanup expanded to both generated DB names; original/restored/backup directories lie under the same owned scratch root. Parent PG and unrelated listeners are not signaled or removed. Individual resource cleanup failure cannot skip remaining actions.

## Evidence and reliability

Read brief, report, supplied diff, full relevant live helper flow and cancellation server implementation. Inspected `commerce-native-restore.log`: 7 passed (1.6m), paired restore 34.4s, explicit 15-table match receipt, subsequent deletion 5.7s, cleanup receipt. Report records final harness, typecheck, lint and formatting exit 0; reviewer did not rerun these checks or independently generate those exit codes. No subagents, production edits, sibling changes, commits or external calls. This review file is the sole write.

The reported first cold-development HMR execution-context failure occurred before restore execution and the unchanged warmed rerun passed. This is limited development-harness reliability evidence, not evidence of a product restore defect; no new product finding is inferred from it. The Vite paired restore proof remains distinct from compiled Node artifact qualification. Root final gate and static/browser gates are outside this scoped verdict.

Unsupported online backup, concurrent writers, corruption, crash/power loss, lost/rotated keys, provider settlement and production secret escrow remain correctly excluded. Closing N1 requires a meaningful local assertion; the rest of the paired restore implementation need not be redesigned.
