# Main integration — 2026-10-02

## Scope and implementation

User authorized merging all outstanding project work into canonical `main`, including necessary integration commits, but not pushing. Initial checkout was `content/research-repin-2026-09-30` at `6b072a42`, with uncommitted site, film, AI consent, auth/account lifecycle, preview transport and acceptance-harness work. There was only one worktree. `agents/content-line` and `content/abi-mcp-sse-current` were already ancestors of main; no unrelated remote branches were merged or existing branches/worktrees removed.

Fetched origin, temporarily stashed tracked and untracked changes, switched to main, and merged the research branch as `517a3a15`. Resolved six Quasar conflicts by retaining origin-scoped pairing and protected previews together with main's persistence fix (`f24351ff`) and header normalization/content-type fix (`eba85aee`). The header regression uses a non-authentication header because the new pairing contract deliberately owns Authorization. Both copies retain pairing regressions, and the rejected-save/cold-load regression remains intact. Restored all stashed local work successfully; the temporary stash was removed by successful pop.

Restored source and verification records are committed separately from the regenerated `docs/` build, following repository convention. No deployment, push, credential provisioning, billing changes, or live generation probe was performed.

## Verification

- Focused merged Quasar API/connection unit suites passed before the merge commit.
- `bun run check` passed on the combined main working tree: format check, TypeScript, zero-warning ESLint, unit tests and production build.
- Additional `bun run test`: 84 files, 714 tests passed.
- `bun run build:static` and `bun run check:static` passed: 129 HTML pages, all four route preload/gzip budgets within limits. Build emitted existing module-directive/config-loader warnings and logged `/404` as a 404 during crawling; it nevertheless completed and published the fallback through the repository build script.
- `bun run test:e2e`: 220 passed.
- Quasar sidecar `bun run typecheck` and `bun run test`: 83 passed, including the installed Next preview transport test.
- Film controlled capture: 23 passed; normal-build capture-disabled guard: 1 passed.
- Disposable local PostgreSQL/backend browser acceptance: 1 passed, including virtual WebAuthn, migration/recovery, durable restart, purge failure/retry, isolation and owned-resource cleanup.
- Separate AI-consent browser/PostgreSQL acceptance: 1 passed across five reachable routes, using a synthetic provider, not live-provider acceptance. Owned child/database/scratch cleanup completed.

The first backend acceptance attempt failed with aborted console navigation and dynamic-import errors while a separate film Vite harness was running concurrently. After the film harness finished, the unmodified backend harness passed in isolation, followed by the AI harness. Shared dev-cache interference is a possible explanation, not an established root cause; no retry weakening or product change was introduced.

This is a TypeScript/Bun repository with no Cargo manifest. Prettier and ESLint are its applicable formatting/lint gates; Rust fmt/clippy are not applicable.

## Remaining qualification boundaries

Existing records still identify live Quasar generation/edit as blocked by provider billing refusal, generation cancellation/restart recovery as outstanding, and existing-database production OAuth upgrades as blocked pending historical identity verification/provenance review. Film frame transport and interactive/capture acceptance do not establish synthesized narration, completed encoded exports, or production publication. Local/synthetic acceptance does not qualify real OAuth providers, physical authenticators, native devices or production deployment.

## Implementation Summary

Integrated the sole outstanding local branch and preserved both main-only fixes; restored and validated the previously uncommitted project work; regenerated the static site from the combined source. Existing branches, the parent PostgreSQL server and unrelated running processes were preserved. All integration is local to canonical main, with no push.
