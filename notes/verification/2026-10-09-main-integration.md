# Main integration, 2026-10-09

Local source integration and public-site qualification completed under the
user's subsequent instruction to merge all into main and checkout main.
This supersedes the earlier no-commit scope for local integration only.

## Integrated work

- `06963033`: sidecar admitted-request drain and ownership, controlled terminal
  publication tests, sanitized audit expiry logging, compiled Node acceptance,
  paired PostgreSQL/native restore acceptance, isolated film watchers, mobile
  player hit-target repair, and the existing Nitro manifest/lock range change.
- `f5b870c5`: merge of `abbey/showcase-native30`, including `853e7b81` and
  `0cdfdab1`. All eight Native30 editions remain distinct from the sixteen
  neural editions. Gallery source matched the pre-merge canonical changes.
- The static site was regenerated after merging, incorporating the six Kokoro
  source-film exports and narrated mark teaser already on main.

## Executed checks

The current combined source passed `bun install --frozen-lockfile` with no
package changes, followed by `bun run check`: formatting, typechecking, lint,
97 Vitest files / 794 tests, and the default server build. The merge introduced
the same gallery source that was included in that gate; Git comparison found
no gallery delta against the preserved pre-merge snapshot.

The separate sidecar typecheck and test suite passed: 113 tests across 15 files,
486 expectations. After the merge, `bun run build:static`, `bun run check:static`
and `bun run test:e2e` passed. The static checker covered 129 HTML pages; the
browser suite passed 226 cases in 5.0 minutes. Home remained at 16/21 preloads
and 162753/225362 gzip bytes. External-reference network checks were excluded
by the existing static checker.

The build emitted the existing `/404` prerender diagnostic, continued through
155 prerender targets, exited successfully and published the generated
`docs/404.html`; the complete static-reference and browser gates then passed.

## Retained evidence and boundaries

Earlier backend/native/film receipts and the exact qualified Node archive
retain their recorded snapshot identities. This integration did not rerun
PostgreSQL/native acceptance or qualify a new persistent Node archive. The
current default build and static/browser gates do not promote that historical
artifact to a current remote release.

The detailed finishing report and ledger retain the historical failures and
qualification boundaries. Raw logs, diff snapshots and one-off evidence
scripts remain local under `notes/verification/2026-10-09-finishing/evidence/`;
their references in historical records are local evidence references, not a
claim that every raw receipt is distributed with the Git repository.

The unowned npm `package-lock.json` remains local and untracked, consistent
with preserving concurrent work in this Bun repository. The existing external
worktree is active and was left intact; its two committed changes are merged.
No push, remote deployment, production migration or paid provider action was
performed. Approved staging identities, live-provider authorization and full
subjective listening/motion review remain required for full delivery.
