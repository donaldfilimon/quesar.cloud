# Neural cancellation review follow-up

Continuation of Task 6/7 in `notes/launch/trailer-editions-2026-10-09/continuation-plan.md`. The preserved execution ledger identifies optional finding Q1: cancellation coverage should wait until synthesis actually enters. The published design and media remain accepted within their recorded technical limits; this follow-up closes that test evidence gap.

## Global Constraints

Work in the canonical checkout. Preserve unrelated edits and all published media. No new dependencies, production behavior changes, secrets, host provisioning, publication, commits, or pushes. Own only `src/lib/trailer-engine/audio.test.ts` and this plan's ignored review artifacts. Use deterministic synchronization rather than sleeps. Full repository gate must pass before completion. Persistent WDBX cutover still requires an operator-selected host.

## Task 1: Exercise cancellation during active synthesis

Strengthen the existing test `cancels a pending synthesis and ignores its eventual output` in `src/lib/trailer-engine/audio.test.ts`. Use an explicit deferred entry signal from the synthesis mock; wait for synthesis to enter before aborting. Assert synthesis was invoked once, the job rejects with cancellation, and resolving the cancellation-ignoring synthesis afterwards cannot publish a result or cause playback. Follow the actual offline export contract and existing test helpers; do not alter production code or claim a production bug. Ensure late work settles before the test finishes. Run the focused audio tests and report exact command/result. Self-review and write the report to the path supplied by the controller. Do not commit.
