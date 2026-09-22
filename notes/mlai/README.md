# mlai records (pre-merge history)

These files are **historical records of the pre-merge MLAI app**, not current
instructions for quesar.cloud. Paths, commands and gates in them (`apps/mlai`,
`bun run check`, Next.js, the monorepo layout) describe
`donaldfilimon/MLAI-CORPORATION-WWW`, which quesar.cloud supersedes as of
2026-09-22. Read them for provenance and design rationale; take current
guidance from `AGENTS.project.md` and `notes/superpowers/specs/2026-09-22-mlai-merge-design.md`.

## Provenance

- **Repository:** `donaldfilimon/MLAI-CORPORATION-WWW` (local checkout `~/dev/active/mlai`)
- **Commit:** `b6f3686b7316b1afcc5c780611c47f51750a26ae`
- **Copied:** 2026-09-22, committed files only (`git archive`), unchanged. This README is new.

| mlai path | here |
|---|---|
| `docs/brand.md` | `brand.md` |
| `docs/four-app-journeys.md` | `four-app-journeys.md` |
| `docs/integration-hardening.md` | `integration-hardening.md` |
| `docs/github-pages.md` | `github-pages.md` |
| `docs/website-app-integration.md`, `docs/website-app-import-manifest.json` | same names |
| `docs/verification/` (dated axe, contrast and journey receipts) | `verification/` |
| `docs/superpowers/` (plans and specs, 2026-09-06 to 2026-09-22) | `superpowers/` |

## What stayed in mlai

`docs/sources/` did **not** move. It is frozen reference (the MLAI prototype
trees consolidated on 2026-09-16, with manifests renamed to `*.source`), and
the GitHub archive of MLAI-CORPORATION-WWW preserves it. Other moved pieces
have their own provenance notes: `sidecars/quasar-service/README.md`,
`sidecars/python-worker/README.md` and `native/README.md`.
