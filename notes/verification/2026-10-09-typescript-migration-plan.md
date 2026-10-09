# Repository TypeScript migration

Authorized scope: migrate all owned JS/MJS/JSX source to TS/TSX, integrate relevant branches into main, remove merged branch labels and push main after verification. Preserve generated browser JavaScript and third-party dependencies. PostCSS configuration moves to supported JSON because Next does not load TypeScript PostCSS configs.

1. Type and verify archived editorial/film source and tests. Ownership: notes/launch/** only.
2. Type archived diagnostic/qualification scripts without replaying their historical side effects. Ownership: notes/verification/**/evidence/*.ts only.
3. Migrate application runtime entrypoints, templates, exported build scripts and package references. Verify root, sidecar, template and native types; strict migrated-source check, static assets and browser acceptance. Ownership: remaining files.

No dependency additions. Work in canonical main. Parallel workers must preserve one another's edits and must not commit, push, replay providers or mutate recorded media/evidence. Controller owns commits, merged branch deletion and push. Historical proof hashes remain historical; renaming source does not requalify media.
