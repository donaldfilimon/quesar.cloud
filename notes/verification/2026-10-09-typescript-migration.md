# TypeScript migration qualification

Canonical main, 2026-10-09. Integrated origin/main's v8 gallery work at
6ba54503, rebuilding generated docs instead of retaining conflicting assets.

Migrated 28 owned JS/MJS/JSX source files to TS/TSX. The data-only PostCSS
config is JSON because Next's installed config loader does not load TS there.
Updated native package exports, preview and fixture entrypoints, editorial
HTML bootstrap and the research export's generated build script. Added strict
archival-source typing to the root typecheck and retained ES2022 compatibility.
Generated browser bundles and third-party dependencies remain JavaScript.
Historical JSON receipt paths/hashes remain unchanged; the migration does not
requalify historical media or replay old diagnostic scripts.

## Verification

- Final staged root `bun run check`: exit 0; format/typecheck/lint, 104 files /
  824 tests, server build. Typecheck includes tsconfig.migration.json.
- Preview service typecheck and suite: exit 0; 113 tests / 486 expectations,
  including installed Next's authenticated HTTP/assets/HMR and session revocation.
- Next template typecheck, native-TS ESLint loading and production build: exit 0.
- CloudKit source strict compilation and Node web-fallback calls: exit 0.
  This is not native-device acceptance.
- Migrated validator tests: 46 passed. Video verifier self-test: 8 passed.
- Editorial browser fixture: 108 geometry checks, deterministic motion and
  offline audio EQ processing passed. No provider or encoder job was run.
- Typed AI interceptor: direct Node import, reply/error/timeout and external
  fetch rejection passed; no network provider call.
- Research artifact export: 21 publications / 7 studies; emitted TypeScript
  build script executed successfully under Node.
- `bun run build:static` and `bun run check:static`: exit 0; 129 HTML pages,
  all four preload/gzip budgets passed.
- Complete `bun run test:e2e`: exit 0; 226 passed in 4.8 minutes.
- Independent final read-only migration review: no actionable findings.

Actual logs are retained locally under /tmp/quesar-ts-*. The first root gate
attempts failed on unused type imports; those were removed before the final
passing staged gate. The default Bun now reports stable 1.4.2. Its prior
executable is preserved at ~/.bun/bin/bun-before-quesar-20261009. Native's
existing dependencies now have a Bun lockfile; no dependency was added.

Public quesar.cloud is still GitHub Pages. Configured-server signup/sign-in
acceptance remains distinct from public authentication, which requires server
deployment. No server deployment or live OAuth/provider acceptance is claimed.
