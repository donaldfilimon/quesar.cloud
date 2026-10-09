# Quesar model-vision copy and brand correction — 2026-10-03

Current local qualification. The Quesar page and share card now describe the model vision without asserting a qualified trained foundation model. Builder copy matches the existing origin-scoped token pairing and remote HTTPS requirement. No authentication, provider, dependency or runtime implementation changed.

## Source and checks

Owned product inputs: `src/routes/quesar.tsx`, `src/lib/og-sections.ts` and generated `public/og/quesar.jpg`. The repository OG generator regenerated that card; the other seven cards remained byte-identical. The actual card was visually inspected for copy and clipping.

On unchanged application inputs, each command completed with exit 0:

- `bun run check`: 744 unit tests in 89 files, formatting, type checks, lint and build.
- `bun run build:static`: static build passed.
- `bun run check:static`: 129 HTML pages checked.
- `bun run test:e2e`: 226 browser tests passed.

Receipts, exact command durations/log hashes and before/after source manifests are in `artifacts/quesar-claims-20261003/rerun/`. The snapshot excludes generated static `docs/` output and the independently owned standalone ecosystem-film directory. Generated static content is validated by the static and browser gates. The first attempted gate stopped because the evidence preimage had a `.tsx` extension inside the lint scan; it was retained byte-for-byte as `.txt` and the full sequence rerun. No production rule was relaxed.

## Corrected local archive

The corrected brand archive, `brand-distribution-2026-10-03-claims-reviewed.tar.gz`, remains in the private local evidence set; this public record is not a download link or a redistribution grant.

- Size: 839,614 bytes.
- SHA256: `c5026c4c5b3b7c2ae6196cab63162b08b6c1dc91e6addce330281441a3af1f9d`.
- 72 regular archive files, 71 verified checksums, 69 pinned inputs and 54 unchanged media references.
- Reproduced twice with identical bytes using the installed Node/packager runtime; cross-runtime gzip identity is not asserted.
- Only the Quesar JPG and bundled README differ as payloads. The README now reproduces this manifest/archive and identifies the card correction. Distribution metadata and checksums update accordingly.

The private local evidence set also retains `2026-10-03-brand-package-claims-inputs.json` and `2026-10-03-brand-distribution-claims-README.md` for reproduction. `artifacts/quesar-claims-20261003/package-reviewed-verification.json` records the archive comparison and verification.

The earlier 842,867-byte archive and its README/input manifest remain historical, unchanged evidence. The intermediate 839,435-byte claims archive predates the bundled-README correction and is superseded by the archive linked here. Neither is the current distribution candidate.

Independent source/card/package review is recorded in the sibling WDBX repository at `docs/reviews/2026-10-03-quesar-claims-correction.md`. Local checks do not establish deployment, trained-model capability, human listening or final creative/rights approval. No site was published.
