# Quesar local brand distribution

A reproducible local snapshot of the existing Quesar by MLAI identity, prepared on 2026-10-03. This package exports source-backed assets; it does not introduce a new identity or assert final creative, legal, or claims approval. No publication was performed.

## Start here

- `identity/site-mark.svg`: exact literal weighted-graph M geometry exported from `sources/src/components/site/logo.tsx`. It keeps the 32×32 viewBox and `currentColor`; the site's 21px display size, 32px rounded CSS badge, theme accent and border shadow remain defined by the original component and site CSS. This is an exact geometry export, not a newly approved master or a complete logo lockup.
- `public/favicon.svg` and `public/apple-touch-icon.png`: existing application icons, copied unchanged. The nested-square favicon is distinct from the weighted-graph M.
- `sources/src/components/site/logo.tsx`: canonical wordmark and lockup source. “Quesar” is live Space Grotesk text (bold, 1.05rem, tight tracking), with the optional “by MLAI” attribution. No outlined wordmark or separate approved master was found; none was fabricated.
- `GUIDELINES.md`: narrative, palette, typography and motion guidance with exact source locations.
- `public/og/` and `public/media/rooms/`: existing social cards and six room posters, copied without regeneration or claims approval.
- `fonts/`: exactly the local Fontsource CSS and font files used by the site imports, plus each package's complete original LICENSE, metadata and package provenance. Space Grotesk Variable and IBM Plex Sans Variable use their current normal variable files; IBM Plex Mono uses weights 400 and 500, including the subsets and fallback files referenced by those CSS files.
- `inventory/source-inventory.json`: original 77-file brand inventory. Canonical repo paths and public URLs are references, not promises that every entry is included here.

The films and teaser videos are referenced with their source sizes and SHA-256 values in `distribution.json`; they remain in the canonical checkout's `public/media/` and are not duplicated in this compact identity package. The six full narrated films, transcripts and captions are accessible through `notes/verification/2026-10-03-film-review.html` in that checkout. Technical film verification does not imply human listening approval.

## Rights and approval boundaries

This is a local package prepared under the repository owner's task authorization. No repository-wide license or separate trademark/brand reuse grant was found. Public visibility is not a redistribution license. Do not infer permission to publish, sublicense, sell or broadly redistribute the Quesar/MLAI assets, source snapshots, social cards or posters from this archive. Confirm the applicable rights and final design/claims approval before external release. Authorship and ownership have not been independently established.

The bundled Fontsource font software is identified locally as SIL Open Font License 1.1. The complete copyright and OFL text accompanies each family at `fonts/<family>/LICENSE`; keep those notices with copies and follow their terms. These font licenses do not license the surrounding brand. No font binaries were modified and no network download occurred.

`public/manifest.webmanifest` is preserved as historical/current application source. Its embedded older theme colors and description do not override the current brand tagline or site CSS. `sources/src/cinematic/film/tokens.ts` records the film-specific palette and personas, not the site-wide color authority. Older design-board tokens are not included as authority.

## Verify and reproduce

Extract `quesar-brand/` with a standard tar reader. From inside it run `shasum -a 256 -c SHA256SUMS`. `distribution.json` lists copied and derived files, exact hashes, original paths and separate media references. SHA256SUMS includes distribution.json and every payload file, excluding itself.

In the canonical checkout, with its existing dependencies installed, reproduce to a fresh output path:

```sh
node scripts/package-brand.ts notes/verification/2026-10-03-brand-package-inputs.json /tmp/quesar-brand-reproduced.tar.gz
shasum -a 256 /tmp/quesar-brand-reproduced.tar.gz notes/verification/brand-distribution-2026-10-03.tar.gz
```

The packager refuses existing output files. It validates all copied input sizes/hashes, rejects traversal, symlinks and duplicate paths, exports only literal allowed SVG geometry, and bounds the payload to 16 MiB. Archive paths are sorted; file modes, owner IDs and timestamps are fixed. Identical pinned bytes and packager/runtime produce identical archive bytes. Cross-version gzip reproducibility is not asserted; the verification receipt records the actual Node and zlib versions used.

Missing, changed or unapproved inputs fail explicitly. Update the input manifest deliberately after reviewing a source change; do not weaken hash checks. No live site, film artifact or identity source is modified by packaging.
