# Task 4 native paired restore — 2026-10-09

## Implemented scope

Only `e2e/backend/commerce.acceptance.ts` changed. Added a serial case before account deletion that:

1. Captures owner and bystander invoice state, including awaiting-payment, cancelled and synthetically settled invoices.
2. Disconnects browser/HMR clients and stops the owned application after awaited writes, leaving both stores quiescent.
3. Creates a seeded PostgreSQL custom-format dump and copies the complete native invoice/account-ledger tree, host configuration/grants and host key into private scratch. It restores to a fresh owned PostgreSQL database and fresh private native directory.
4. Verifies restored/original public SQL table row hashes, full native file tree hashes, directory/file permissions and unchanged configuration/key hashes without printing key/session material.
5. Starts the actual application against the restored pair with the same generated signing/encryption keys held in fixture memory. Preexisting owner/operator sessions must resolve the original user IDs; owner and bystander native reads must exactly match, a known foreign invoice operation must refuse, and the same synthetic operator must replay the paid receipt unchanged.
6. Runs subsequent account-deletion/same-email replacement qualification against the restored pair while retaining the original pair until owned teardown. Both named disposable databases and all private scratch are cleaned through the existing aggregate cleanup path.

Existing sibling native executable reused without rebuilding/mutating it. No production admission/security policy, schema, public CSS, service source, dependencies, secret source, remote service or provider changed. No commits/subagents.

## Verification

Repository: `/Users/donaldfilimon/dev/active/quesar.cloud`. Vite harness began only after root explicitly confirmed its build had exited.

- Harness command: `QUESAR_BACKEND_ACCEPTANCE=1 QUESAR_ACCEPTANCE_ADMIN_URL=postgresql://127.0.0.1:55471/postgres bunx playwright test -c e2e/backend/commerce.config.ts`.
- First run: exit 1 at the existing anonymous first read (`page.evaluate` execution context destroyed during Vite dependency HMR after signup); restore case never ran, six cases unrun, owned cleanup completed. Assertions were preserved; same harness reran with the warmed development cache.
- `bun run typecheck`: exit 0.
- `bunx eslint e2e/backend/commerce.acceptance.ts --max-warnings 0`: exit 0 after replacing an unused zero initializer with a typed declaration.
- `bunx prettier --check e2e/backend/commerce.acceptance.ts`: exit 0.

Final native restore receipt is appended after the harness completes.

## Limits

This is a coherent **quiescent local paired backup/restore**, with all application writers stopped and awaited native subprocess calls completed before copying. It does not qualify production online backups, concurrent writers, filesystem snapshot atomicity, abrupt power loss, crash recovery, corruption, lost/rotated signing or encryption keys, or production secret/key escrow. Stable generated auth/encryption keys remain in fixture memory and are re-provided; the native host key is copied only inside private disposable scratch.

Settlement and linked Google evidence remain synthetic local fixtures: no actual OAuth provider, payment provider, funds movement or production commerce acceptance claim. Native reads and restored authentication use the actual running Vite backend and existing native executable; this is separate from Task 4's compiled Node artifact qualification, which does not itself prove native commerce restore.

Logs: `/Users/donaldfilimon/Documents/Codex/2026-10-09/new-chat-2/work/task4/commerce-native-restore.log`, `commerce-native-lint.log`, `commerce-native-typecheck.log`, `commerce-native-format.log`. Root owns parent PostgreSQL, final repository gates, final static/browser build, and independent review.

## Final receipt — Current

Guarded commerce harness rerun: **exit 0, 7 passed (1.6m)**. New paired restore case passed in 34.4s: seeded `pg_dump`/`pg_restore` exits 0/0, all **15 PostgreSQL public tables** hash-equal, complete native ledger/account-ledger tree plus host config/key and permissions preserved, actual restored app accepts original owner/operator sessions and identical native invoice states, and bystander foreign-invoice refusal remains. Subsequent real account deletion and same-email replacement passed against the restored pair (5.7s), preserving all bystander invoices with exact count and contents.

Owned app/browser contexts, original and restored identity databases, complete native original/backup/restored scratch and key files cleaned successfully. Parent PostgreSQL was not stopped. Source frozen for root independent review/final gates; no native build or production source changes required.

## Reviewer N1 fix round

The reviewer correctly identified that foreign cancellation of a paid invoice also rejects its owner, so the earlier paid-state negative assertion was not a discriminating authorization control. The fix selects a restored owner's `awaiting_payment` invoice: the bystander must fail to cancel, the owner's entire inventory must remain exactly equal to its prior structured read, then the owner must successfully cancel that same invoice. The resulting owner inventory must equal the original inventory with only that exact returned cancelled invoice substituted; the bystander inventory remains exact. The separate restored paid receipt/operator replay stays unchanged, as do full native/SQL backup comparison and subsequent restored account-deletion assertions.

Cold development failure characterization: the observed first run lost the anonymous page execution context after signups first visited `/profile`; the previous warmup visited only `/login` and omitted lazy profile/billing/passkey dependencies. Development optimizer reload is the working explanation, supported by the warmed unchanged rerun, but no captured Vite optimizer receipt proves that exact causal sequence. The helper now explicitly visits login/profile/login and reads commerce readiness before any signup or invoice mutation. Its previous three-attempt warmup retry loop is removed; account writes and journey assertions are never retried silently. This fixes the concrete missing-dependency warmup surface without claiming exhaustive flake elimination or a forced-cold-cache qualification.

### Fix-round verification — Current

- Final guarded commerce rerun: **exit 0, 7 passed (47.5s)**, same command/prefix as above. New discriminating restore case passed in **7.5s**: restored foreign awaiting-payment invoice cancellation refuses without changing owner inventory, original owner then cancels it successfully, exact transformed owner/bystander inventories match, and separate paid operator replay remains identical. All original SQL/native restore hash/permission checks and subsequent deletion/replacement proofs passed.
- First fix-round run under concurrent 226-case static browser load: exit 1, 4 passed and 2 unrun; existing restart profile remained at “Loading session…” past its unchanged 20s assertion timeout. Cleanup passed. The unchanged complete rerun passed (restart 9.0s, deletion 1.7s); no timeout or journey assertion was weakened. Load is a plausible contributor, not a proven diagnosis. Initial warmup completed successfully in both runs; no exhaustive Vite/hydration reliability claim is made.
- Focused lint, formatting and root typecheck: exits 0.
- Final owned process/database/native scratch cleanup passed. Source frozen for re-review/final gates. Logs: `commerce-native-fix.log` (green), `commerce-native-fix-first.log` (preserved failure), `commerce-native-fix-lint.log`, `commerce-native-fix-typecheck.log`, `commerce-native-fix-format.log` in the Task 4 workspace log directory.
