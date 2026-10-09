# Task 4 artifact-root ownership review — 2026-10-09

## Verdict

**Spec source assessment: PASS. Quality: APPROVE. Runtime integration: PENDING controller receipt.** No actionable source findings in the optional artifact-root change. A source approval does not establish successful qualification of the controller-frozen artifact or its relocated resource paths.

## Scoped assessment

- **File:line:** `e2e/backend/persistent.acceptance.ts:18`, `e2e/backend/persistent.acceptance.ts:21`.
  **Status:** Verified by inspection. Existing disposable acceptance guard executes first. Supplied roots must be nonempty absolute local paths; HTTPS/file URLs and relative paths refuse instead of being fetched. Omitted override preserves the repository .output default. Paths are passed directly to spawn/filesystem APIs without shell interpolation.
- **File:line:** `e2e/backend/persistent.acceptance.ts:96`, `e2e/backend/persistent.acceptance.ts:180`.
  **Status:** Verified by inspection; runtime relocation pending. Root is canonicalized and requires a regular compiled server entry and public directory before scratch/database setup. Explicit root becomes the child cwd and compiled entry base; no source entry execution or copying occurs in the helper. Default cwd remains unchanged. Credential allowlist and persistent-policy assertions remain intact.
- **File:line:** `e2e/backend/persistent.acceptance.ts:31`.
  **Status:** Verified by inspection. Sorted recursive directory/file records and regular-file byte lengths/contents cover the full resource/module tree. Internal link spelling is hashed, realpath rejects dangling links and targets outside the canonical root; internal target contents are included through their actual directory/file locations. Unsupported filesystem entries fail rather than being silently omitted.
- **File:line:** `e2e/backend/persistent.acceptance.ts:249`.
  **Status:** Verified by inspection. Owned child stop precedes the unchanged-tree hash assertion in aggregate cleanup. A failed integrity assertion does not skip remaining owned pool/database/proxy/scratch cleanup. Controller root is never removed. This detects final content/tree changes; it is not a filesystem lock, OS snapshot or proof that a transient modification was never restored.

## Evidence

Read supplied whole-file review artifact, current scoped code and report. Inspected URL refusal and default discovery logs: URL input is rejected with 0 tests found; default discovers exactly the existing persistent case. Report records focused typecheck/lint/format exit 0 and URL-refusal exit 1; reviewer did not rerun checks. The preserved root-reported replacement failures motivate the override, but are not reclassified as production policy failures.

Required final evidence is the controller's coherent full-tree build/copy receipt plus actual acceptance against the explicit frozen root, including compiled browser resources, initial/final helper hash equality, prior configuration/session/isolation/restart/restore assertions and cleanup. At writing this note that integration is pending. No tests rerun, source fixes, subagents, builds, commits or external actions; this review file is the sole write.

## Limits

Controller ownership/immutability and serialization for the default shared .output remain prerequisites. Hash excludes permission/timestamp metadata and cannot prevent transient changes; the report correctly presents integrity detection rather than access-control enforcement. This correction does not qualify public TLS, deployment, live providers, production backups or native commerce restore beyond their separately recorded scopes.
