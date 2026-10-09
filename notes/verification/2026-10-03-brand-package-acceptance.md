# Local brand distribution acceptance — 2026-10-03

**At 2026-10-03 acceptance:** a reproducible local package of existing Quesar identity assets, source references and licensed font software. Independent Standards and Spec review passed with zero open findings at that time. **Partial:** final creative/claims and external rights approval are not asserted. **Out of scope:** publication, production source changes, redesign and film regeneration.

The private local evidence set retains `brand-distribution-2026-10-03.tar.gz`, `2026-10-03-brand-distribution-README.md`, `2026-10-03-brand-package-inputs.json` and `2026-10-03-brand-package-verification.json`. The public [guidelines](2026-10-03-brand-distribution-guidelines.md) describe the package boundaries.

Archive: **842,867 bytes**. SHA-256:

```
73b779ac79c37b2e5a0e48cd25d6b8db253af824f00890ea43456b20ca1b7f60
```

The archive contains 72 regular files: 69 copied inputs, one exact SVG geometry export, distribution.json and SHA256SUMS. It records another 54 canonical film/teaser references without duplicating the videos. Every reference was rehashed against current local originals during acceptance. The complete three font-family notices and all files referenced by the site's existing Fontsource CSS are included unchanged.

The primary weighted-graph M geometry exists in src/components/site/logo.tsx and is exported directly from its literal SVG, preserving the path and five circles. The export is currentColor with the existing viewBox. The CSS badge and live Quesar / by MLAI wordmark remain documented source; no outlined wordmark or separate approved master was found or invented. The nested-square favicon remains a distinct unchanged icon. Current src/styles.css and cinematic mappings remain the palette authority; the README explicitly limits the older manifest theme fields and film-specific palette.

No repository-wide reuse license or separate brand/trademark grant was found in the reviewed checkout. The archive is a local task-authorized review/use package, not a grant of public redistribution rights. The original font licenses apply only to their font software. Authorship, ownership and final public-release rights are not independently adjudicated by packaging.

## Checks

| Check | Result |
| --- | --- |
| Regression-first missing implementation | Expected missing-module failure before implementation |
| File/directory conflict regression | Expected failure before conflict guard; passes after guard |
| bunx vitest run scripts/package-brand.test.ts | 20 passed |
| bun run check | Exit 0; formatting, typecheck, lint, 89 files / 744 tests, production build |
| Fresh second package generation | Exact archive-byte equality and identical SHA-256 |
| Python standard-library tar extraction | 72 sorted regular entries; fixed mode 0644, uid/gid/mtime 0 |
| shasum -a 256 -c SHA256SUMS in extracted directory | Exit 0; all 71 listed payload hashes match |
| Original font CSS references | All bundled dependencies resolve locally |
| SVG XML inspection | Exact viewBox and six literal geometry elements |
| Canonical media references | All 54 actual sizes and SHA-256 values match |
| git diff --check | Exit 0 |

Runtime: Node v26.10.0, zlib 1.2.12, TypeScript 6.0.3. Same-input reproducibility was measured on this runtime; cross-version gzip byte equality is not asserted. The full final gate log is retained privately as `2026-10-03-brand-package-check.log`. Terminal tool result: session 62761, exit 0. No brand task process remains running.

Reproduction command (output must not already exist):

```sh
node scripts/package-brand.ts notes/verification/2026-10-03-brand-package-inputs.json /tmp/quesar-brand-reproduced.tar.gz
```

The source scope is two new scripts and brand-only verification additions. Private local evidence files `2026-10-03-brand-package-scoped.patch` and `2026-10-03-brand-package-source-snapshot.json` freeze that scope. Existing film artifacts, product source, docs/ static output and other agents' dirty work were preserved. No new dependency, network download, commit, push or publication occurred. Because this slice changes only offline packaging and notes, it does not change the already-verified static site or require regenerating its media.

An independent Quesar brand package review was retained in the sibling WDBX repository at `docs/reviews/2026-10-03-quesar-brand-package.md`; that sibling record is outside this repository. This acceptance-note update does not change the frozen package inputs or archive.
