## Security Audit: Quesar first-party WDBX invoicing

### Summary
Revalidated: zero open findings in this focused review; both original medium findings are fixed in the inspected source and focused regressions. Reviewed commerce server functions, repository, native adapter, account-deletion integration, and engagement UI on 2026-10-09. No implementation edits made by reviewer. Concurrent backend edits may invalidate line numbers; findings describe the inspected implementation.

Current evidence: focused `bunx vitest run src/lib/server/commerce.server.test.ts` completed with exit 0: 1 file, 6 tests passed. The test uses a real WDBX executable, although admin decisions are mocked. Independent isolated reproductions below both exited 0. Full repository gate, remote deployment, production configuration, real admin provider identity, and payment receipt verification were not qualified by this review.

### Finding 1: Invoice capacity can disable all users' discovery and account deletion
- **Severity**: medium
- **Category**: Availability / CWE-400
- **Location**: `src/lib/server/commerce-wdbx.server.ts:104`; creation at `src/lib/server/commerce-wdbx.server.ts:117`; rate limit at `src/lib/commerce.ts:14`
- **Description**: Discovery throws once the global directory count exceeds 1,000. Creation directly creates another directory without checking that threshold. The only HTTP creation limit is 20 requests per account per hour, and local password signup is open. `list` and `unlinkAccount` both depend on this global discovery; deletion invokes unlink before deleting the auth account.
- **Impact**: A signed-in attacker can exhaust global discovery capacity, disabling invoice listings and deletion for unrelated users until an operator changes the ledger/discovery design. Normal business growth reaches the same failure. Cancelling invoices does not remove directories.
- **Reproduction**: With durable commerce configured, create 1,001 distinct invoice request UUIDs across accounts/time windows. All subsequent list and deletion calls reach the capacity error. Independently tested the actual adapter `ids()` using temporary private directories and valid config: 1,000 directories returned 1,000 IDs; adding the 1,001st caused `Commerce invoice discovery capacity exceeded; operator review required.` No live ledger was used; this focused reproduction did not create 1,001 native invoice commits or exercise HTTP signup.
- **Remediation**: Enforce a concurrency-safe global admission policy before new directory publication, preserving retries for existing IDs, or implement bounded paginated discovery so growth cannot globally disable reads/unlink. Do not silently truncate deletion scans. Include a boundary/concurrent-admission regression and verify unrelated-user deletion at capacity.
- **Status**: fixed; revalidation below

### Finding 2: Deletion snapshot permits new invoices to retain a deleted user's identity
- **Severity**: medium
- **Category**: Privacy / race condition / CWE-362
- **Location**: `src/lib/server/commerce.server.ts:194`; creation at `src/lib/server/commerce.server.ts:90`; deletion integration at `src/lib/server/account-deletion.server.ts:47`
- **Description**: `unlinkAccount` takes one directory snapshot. A create request authenticated before deletion can publish a new invoice after that snapshot, including `userId` and the created event actor. There is no shared user deletion fence or serialization spanning authentication, invoice publication, and unlink. The native per-invoice writer lock cannot serialize different invoice IDs with account deletion.
- **Impact**: Successful account deletion can leave the deleted user's association in the current authoritative invoice, contradicting the deletion contract. This is separate from deliberately retained encrypted financial history.
- **Reproduction**: Start an authenticated creation and delay its invoice publication. Allow deletion's `ids()` to snapshot first, then complete creation, then let deletion finish. The new ID is absent from the unlink scan. Independently reproduced using the actual transpiled `CommerceRepository` with a controlled in-memory store and identity sealing stubs: interleave create after the IDs snapshot; `unlinkAccount` returned 0, and `list(buyer)` returned 1 still-associated invoice. This proves domain sequencing; an end-to-end auth deletion/native race was not run.
- **Remediation**: Introduce a durable per-user deleting/tombstone state and serialize admissions against deletion across processes. A create that authenticated earlier must re-check under the same serialization before publishing. Deletion marks the user first, drains or blocks existing admissions, then unlinks. Repeated unfenced directory scans alone cannot establish absence of concurrent future writes.
- **Status**: fixed; revalidation below

### Positive Observations
- Money, product, and currency are owned by the server; buyer requests accept only strict UUID input.
- Buyer cancellation validates ownership, and settlement performs the existing provider-verified admin decision before touching an invoice.
- Stable creation identity and terminal-state checks support duplicate requests and uncertain write recovery without inventing payment success.
- The native transaction requires the next sequence and complete observed own-writer prefix (`wdbx/zig/data/typed_transactions.zig:190,195`), preventing competing stale same-writer snapshots from both committing.
- Invoice payloads are sealed with AES-256-GCM and invoice-specific AAD. Payment references and settlement identities are excluded from the buyer-facing order shape.
- UUID validation restricts invoice path components; root/invoice directory permissions and leaf symlink rejection are enforced. Request scratch has private permissions and cleanup in `finally`.
- Existing native tests cover concurrent create, denied ownership/admin access, competing settlement, retained/unlinked business facts, uncertain acknowledgement recovery, and symlink rejection.
- UI duplicate-click handling uses an immediate ref lock plus a persistent request UUID, and static mode states that payment collection is unavailable.

### Scope limits
No installed secret values were printed or inspected. Configuration paths are operator-controlled. No concrete remote filesystem substitution attack was established; this review does not claim hardened protection against another process with the service UID. No new dependency was added in the billing files, and no dependency CVE scan was performed. React account switching/unmount behavior was inspected but not browser-tested. The implementation is manual invoicing, not an integrated payment rail: an admin's recorded reference is a claim that requires operational confirmation of received funds.

Implementer severity mapping: medium -> minor.


### Revalidation on 2026-10-09 at 03:52 EDT

Read the revised adapter/repository and all commerce regression cases. Independently ran:

`bunx vitest run src/lib/server/commerce.server.test.ts src/lib/server/account-deletion.server.test.ts src/lib/server/admin.server.test.ts`

Exit **0**, **3 files / 19 tests passed**, start 03:51:58, duration 1.49 seconds. Commerce tests operate the real configured WDBX executable. Admin provider decisions are mocked in commerce tests; the independent admin decision suite is also included. This is focused qualification, not the full repository gate or a deployed-service audit.

**Finding 1 fixed:** `update(create=true)` takes the shared `.creation-lock` before checking capacity and creating a new invoice directory. It admits existing IDs for stable retries and rejects a new directory when discovery count is 1,000. The new regression creates temporary synthetic private directories to reach 1,000, asserts discovery still returns all 1,000, attempts creation, and verifies the rejection leaves count unchanged. This establishes admission rejection and available discovery at capacity, not a 1,000-native-invoice benchmark or browser account-deletion latency measurement. Account fences use a separate hidden WDBX namespace, outside invoice discovery, so empty-account deletion does not consume invoice capacity.

**Finding 2 fixed:** `CommerceRepository.create` and `unlinkAccount` hold the same per-user atomic directory lock across admission/publication and tombstone/unlink respectively (`commerce.server.ts:93,200`). Unlink commits a durable WDBX deletion marker before scanning; subsequent creates check it inside the lock and fail closed. `settle` likewise locks/checks the administrator actor, closing the corresponding settlement-actor deletion race. Native invoice sequence validation preserves concurrent buyer-unlink versus settlement state. The new real-native regression races create and unlink, verifies no buyer-associated invoices remain, then verifies later creation is refused. The account marker is plaintext `account-deleted` under a hashed account identifier in a private directory; it is a control marker, not an encrypted financial payload or raw user identifier. Financial snapshots remain sealed.

**Lock failure revalidation:** independently executed the actual transpiled `WdbxCommerceStore` in disposable private scratch with valid config. A controlled callback exception released its account lock, and immediate reacquisition succeeded. A pre-existing stopped-writer lock refused admission after bounded retries, did not run the callback, requested operator review, and remained intact. Script exit **0**. No native writes or live state were involved in this lock-only check.

**Remaining operational limits and proof gaps:** abrupt process death can retain an account/global creation lock because no unsafe expiry stealing occurs. An operator must verify no live holder before recovery; callbacks release locks during normal error unwinding. If deletion later fails after its durable fence commits, commerce remains fenced while account deletion is retried; rollback/re-enablement is not automatic. These are explicit fail-closed operational tradeoffs, not newly established remote exploits. Multi-host filesystems, crash injection, HTTP auth-deletion races, settlement-actor deletion races, browser cancellation/account switching, 1,000-invoice runtime performance, and payment receipt verification were not independently exercised. No unresolved concrete vulnerability was found during this bounded revalidation.
