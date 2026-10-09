# Task 4 native restore N1 follow-up — 2026-10-09

## Verdict

**Spec: PASS for the assigned quiescent local paired restore scope. Quality: APPROVE. N1: ADDRESSED.** No unaddressed or new fix-induced findings in this scoped review.

## Finding disposition

- **Severity:** Original P2 acceptance coverage/claim correctness.
- **File:line:** `e2e/backend/commerce.acceptance.ts:328`, `e2e/backend/commerce.acceptance.ts:447`.
- **Description:** The restored target is now explicitly an owner's awaiting-payment invoice. Foreign cancellation must return the refusal, and an exact owner inventory read must remain unchanged. The actual original owner then cancels the same invoice successfully; its inventory must equal the original list with precisely that returned cancelled invoice substituted. Exact bystander inventory remains unchanged. Removing the owner check would now cause either the foreign refusal or unchanged inventory assertions to fail, so the test distinguishes scoping from paid-state rejection. The paid invoice remains separate for restored operator replay.
- **Suggestion:** None required for N1.
- **Status:** Addressed by meaningful negative and positive controls; source inspection and recorded successful run support closure.

## Warmup review

`e2e/backend/commerce.acceptance.ts:199` visits login/profile/login and invokes read-only readiness before signup/invoice mutations. Profile route imports its profile/billing/passkey modules at module scope, so anonymous navigation can discover those dependencies even though its protected inner panels do not execute authenticated effects. The old broad retry loop was removed. No journey write or assertion is silently replayed, no timeout extended, and no product/security behavior changed. This is a reasonable bounded dependency warmup; neither source nor successful run establishes exhaustive cold-cache or hydration flake elimination.

## Preservation and evidence

The original quiescent copying, complete native tree/config/key/mode comparison, 15-table SQL restore comparison, restored URL/pool/native-path switch, existing session IDs, subsequent restored account deletion and aggregate owned cleanup remain intact. The positive cancellation affects only the restored owner invoice; the original pair stays retained until teardown.

Read the amended diff/live restore and warmup code, report fix-round section, profile route module and `commerce-native-fix.log`. Log confirms 7 passed (47.5s), discriminating restore case 7.5s, restart 9.0s, deletion 1.7s and cleanup. Report records command exit 0 and focused lint/format/typecheck exits 0; reviewer did not rerun those commands. Earlier report preserves the unchanged restart timeout under concurrent static load; load is an unproved contributor, not a product diagnosis. No assertion weakening appears in the fix.

No tests rerun, subagents, production changes, commits or external actions. This review file is the sole write. Root final gates remain separate. Vite/native paired restore does not extend compiled Node artifact evidence to native commerce or qualify live providers, production online backups, crash/power-loss recovery or key escrow.
