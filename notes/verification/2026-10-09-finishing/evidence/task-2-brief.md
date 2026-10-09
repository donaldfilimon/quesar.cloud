# Task 2: current service lifecycle qualification

Own sidecars/quasar-service source/tests only, plus this report. Read repo AGENTS.md/CLAUDE.md and nested guidance. You are not alone; do not revert others' changes. No subagents, no commits/pushes/PRs, no dependencies, no external provider calls, no secret reads. Canonical main authorized; do not create worktree. Root owns public/backend gates and ledger.

Reconcile historical R1-R10 in notes/verification/2026-10-02-completion-review.md against CURRENT source. Qualify admission/shutdown barriers, failed constructor release, cancellation, restart recovery, single home ownership, preview auth/origin/ws, event stream retained epoch behavior. Run sidecar bun run typecheck and bun run test (root runner differs). Fix only demonstrated defects, with regression tests. Do not alter protocol gratuitously. Preserve user scoping/pairing.

Write task-2-report.md beside this brief with status, exact source evidence per historical finding, files changed, test commands/exit/count, proof limitations and concerns. Return concise status and report path. No worker-spawned reviewers. If full run takes time keep controller updated.
