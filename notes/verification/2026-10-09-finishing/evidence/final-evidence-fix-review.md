# Final evidence closure re-review — 2026-10-09

## Verdict

**Both prior P2 findings: ADDRESSED. Scoped source/evidence quality: APPROVE. Overall finishing specification: PARTIAL, with the existing subjective-film and external-staging/provider gates Blocked.** No new source correctness or security finding in the artifact-root helper amendment. This review supersedes the pending-evidence verdict in `final-review.md`; it does not expand local qualification into production or live-provider acceptance.

## Finding dispositions

| Severity | File:line | Description | Suggestion | Status |
| --- | --- | --- | --- | --- |
| Prior P2 evidence closure | `notes/verification/2026-10-09-finishing/finishing-report.md:15` | Latest root receipt contains 97 passing files/791 passing tests and completed build; controller records exit 0. Final static browser receipt ends 226 passed (5.6m), and final persistent receipt ends 1 passed (27.8s). New expiry regressions are included; prior failed attempts remain described. | Preserve these named final receipts, rather than treating the earlier 789-test gate as current. | ADDRESSED. |
| Prior P2 artifact provenance | `notes/verification/2026-10-09-finishing/finishing-report.md:9` | Final static manifest contains 565 files; reviewer independently hashed the current canonical docs tree and observed 565 files, delta 0 against that manifest. Final compiled Node acceptance records the same full-tree SHA256 before and after all assertions. Dependency restoration, unowned package-lock, earlier snapshot qualification and failed copies/refusal are distinguished. | Keep the archived tested artifact, corresponding source/dependency manifests and failed-attempt receipts together. | ADDRESSED. |
| P3 documentation clarity | `notes/verification/2026-10-09-finishing-ledger.md:13` | Browser row still quotes 163067 home gzip from an intermediate rebuild; final qualified-static-check and finishing report use 162715. The final numbers are supported, but the chronological paragraph can be misread as attributing the intermediate number to the final frozen copy. | Label 163067 explicitly intermediate, or remove that superseded metric from the final ledger row. | Nonblocking wording follow-up; controller notified. |
| Informational archive disposition | `notes/verification/2026-10-09-finishing/finishing-report.md:89` | The earlier pending archive-verification sentence was corrected during review. The manifest now records 716 verified entries, archive size and SHA256. | None. | Corrected and consistent with controller packaging receipt. |
| Informational ownership limit | `notes/verification/2026-10-09-finishing/finishing-report.md:81` | Premature PostgreSQL stop/restart and unknown impact on another job are retained. Active unowned connections/databases require preserving the cluster/workspace; complete cluster cleanup is not claimed. | Keep ownership verification ahead of any later cleanup; no background cleanup is promised. | Explicit retained-resource limitation. |

## Amended helper

`e2e/backend/persistent.acceptance.ts:21` keeps the opt-in database guard and validates the optional artifact root as a nonempty absolute local path. Canonicalization and regular compiled entry/public directory checks precede fixture setup. `:96` starts the actual compiled entry with the explicit root as cwd, retaining the runtime environment allowlist, owned bind receipt, config refusal and existing security/runtime assertions. `:31` covers sorted directory/file/link records and bytes, rejects escaping or dangling links and unsupported entries, and permits Nitro's internal tslib link. `:249` stops the owned child before asserting unchanged artifact contents and retains aggregate cleanup even if hashing fails. Controller artifact storage is never removed by the helper.

No production policy, dependency or auth test was weakened. The unchanged-tree assertion is integrity evidence, not an OS snapshot, permission check or proof against transient modifications restored between hashes. The scope review already identifies these limits. Current runtime receipt closes its previously pending relocation/integration proof.

## Receipts inspected

- `qualified-root-check.log`: 97 files/791 tests pass and Vercel build completes. Controller reports actual command exit 0 after the helper amendment. No test rerun by reviewer.
- `qualified-static-check.log`: 129 HTML pages, home 16/21 preloads and 162715/225362 gzip bytes; 25 external references excluded from network checks. Controller exit 0.
- `qualified-static-browser.log`: 226 passed (5.6m); controller exit 0. Independently inspected current canonical docs against the 565-file qualified manifest: exact hash equality, delta 0, inspection command exit 0.
- `frozen-artifact-build.log`: Node output generation completes; controller exit 0 and recorded before/copy/after coherence for 716 file/link entries.
- `qualified-persistent-acceptance-retry.log`: compiled frozen v4 root; missing config refuses with NODE_ENV absent; exact nine explicit migrations; secure sessions, known foreign audit refusal, decrypt/transplant denial; restart and seeded dump/restore 0/0 with 15 equal public tables and same-session restored app; helper-owned cleanup completes. Final result 1 passed (27.8s), controller exit 0. Hash unchanged: `58e05945b0a7a26f84ae56c56e222e8e786f557cd17baf35c9993a2e841fbe87`.
- `qualified-node-artifact-hashes.json`: 716 artifact entries including internal `server/node_modules/tslib` link; dependency SHA256 values `ea52493b657ec0e327f268ba9f80d513b0ade9c37d53f1be157adb0874931f1a` and `a38fc69b05efe9fb9b40e3d1bb4e7e81d8af5243dba3eb7e3b1e945d9f6e947f`; archive 215679625 bytes, 716 verified entries, SHA256 `16a98901a8a439d843bcf56cf77353d505fa80dcdc246afe434419999ebe83f2`. Archive byte/entry verification is a controller receipt; reviewer read the manifest rather than re-executing packaging.

Read the scoped final diff package, live helper, artifact ownership report/review, current ledger, finishing report/runbook and relevant logs/manifests. Prior whole-source approval remains applicable to unchanged owned source; this is not a new exhaustive audit of minified dependencies. No tests/builds, database actions, source edits, commits, external operations or subagents were performed. This review note is the sole write.

## Remaining bounded issues

All 16 subjective listening/motion reviews remain pending. Remote target/public TLS, real OAuth/workspace/LLM/generation/payment, historical provenance, production key retention and host operations remain unqualified; production cutover has no authorization. Service internal publication ordering/deeper storage fault proof and native online/crash/production restore remain Partial. The first frozen-helper restored-profile timeout is preserved with an unchanged successful retry; concurrent load is an unproven explanation, not an established cause. PostgreSQL/workspace retention remains explicit and another job's impact from the earlier restart is unknown. These limits are represented truthfully and are not erased by green local gates.
