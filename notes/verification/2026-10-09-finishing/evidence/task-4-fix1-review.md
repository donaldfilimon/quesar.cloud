# Task 4 F1 follow-up review — 2026-10-09

## Verdict

**Spec: PASS. Quality: APPROVE. F1: ADDRESSED.** No unaddressed findings or new fix-induced findings within this scoped rereview.

## Finding disposition

- **Severity:** Original P3 / non-blocking local harness reliability.
- **File:line:** `e2e/backend/persistent.acceptance.ts:78`, `e2e/backend/persistent.acceptance.ts:237`.
- **Description:** Startup now requires the exact-port listening receipt from the owned child's bounded stdout before sending readiness requests. Spawn errors, child exits, and bind errors cause refusal. An occupied selected port therefore fails the harness instead of allowing an unrelated readiness response to establish ownership. The disconnected DB check holds an owned TCP listener throughout SQL and auth probes; its sockets are destroyed immediately, so another local service cannot claim that port during the check.
- **Suggestion:** No further change required for F1. Future artifact changes that alter the listening receipt must update this prerequisite; an unexpected receipt currently fails closed.
- **Status:** Addressed. Selection itself still releases the artifact port before spawn; collision now causes failure, which satisfies the ownership concern without requiring automatic retries.

## Fix quality

`e2e/backend/persistent.acceptance.ts:270` uses aggregate finally cleanup to stop the referring app, end the probe pool and close the held listener even if an earlier cleanup action fails. Immediate socket destruction avoids lingering accepted connections preventing server close. Runtime credential allowlist, bounded redacted stderr, production HTTPS/auth policy, exact migration assertions, compiled session/isolation/restart/restore checks and parent resource ownership remain intact. New stdout is retained only in a bounded local string and is not logged.

## Evidence and limits

Read the fix review diff, current helper and appended report; inspected `persistent-ownership.log`, `lint-ownership.log` and `typecheck-ownership.log`. Persistent log confirms 1 passed (29.6s), prior configuration/migration/isolation/restart/15-table restore receipts and owned cleanup. Report records exit 0 for persistent, focused lint and typecheck. No checks were rerun by this reviewer, and those command exits are report evidence rather than independently executed reviewer gates. No production source edits, test weakening or ownership expansion appear in the fix. Root final gate remains in progress and outside this verdict.

No competing-listener failure-injection run was supplied or performed; the ownership refusal is established by source inspection and the successful owned-receipt run. Local artifact evidence remains distinct from Vite consent/commerce coverage and does not qualify live payments/providers, public TLS or remote deployment. The review notes file is the sole write.
