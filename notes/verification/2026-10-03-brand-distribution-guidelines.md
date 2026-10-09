# Existing Quesar identity: use and source map

This is a source-backed snapshot, not a redesign or additional claims approval. Paths below are the original canonical repository paths; copies included here are under `sources/` unless marked `public/`.

## Narrative

Quesar by MLAI uses **Private AI operations.** Abbey/ABI own **Intelligence Without Limits**, accompanied by their claims ledger; do not put that line on Quesar's hero or default OG card. Do not interpret IWL as unlimited capability or AGI. Preserve Current, Partial, Proposed and vision/roadmap boundaries. Authority: `notes/mlai/brand.md` and `src/lib/site-identity.ts`.

## Mark and wordmark

`src/components/site/logo.tsx` is the authority: a weighted-graph M, with the path M8 23 → 8 10 → 16 16 → 24 10 → 24 23 and five weighted nodes. The exported SVG preserves those literal elements. Color is `currentColor`, inherited from the site accent. The surrounding badge and typography are CSS, not part of the SVG geometry.

The text lockup says Quesar / by MLAI. Preserve the component's spacing and typography rather than inventing outlined lettering. The favicon is a separate nested-square application icon. No minimum-size, print-safe area, trademark permission or standalone outlined master has been found in the reviewed sources; those specifications require an approved decision.

## Colors

Authority: `src/styles.css`, light `:root, [data-theme="light"]` block and dark `[data-theme="dark"], .mlai-ds` block. `src/cinematic/design/mlai-ds-tokens.css` maps cinematic roles to these tokens.

| Role | Light | Dark |
| --- | --- | --- |
| Background | #f8fafc | #050508 |
| Foreground | #111827 | #f8fafc |
| Card | #ffffff | #0d111b |
| Primary / chain accent | #086b89 | #00d4ff |
| Primary foreground | #f8fafc | #02151a |
| Muted foreground | #526174 | #a9b7cb |
| Border | #d6dee8 | #253044 |
| Abbey / current | #2e6b4a | #7fc49b |
| Aviva / ABI product accent | #6d28d9 | #b69aff |
| Warning / partial | #8a5a12 | #e0b060 |

The persona ABI token uses the primary chain accent. Product ABI's separate accent uses violet. Preserve these roles instead of merging them. Scope matters: the film-specific `src/cinematic/film/tokens.ts` palette is existing cinematic source, and older design-board values do not override the site.

## Typography

Authority: the imports and `@theme inline` families in `src/styles.css`.

- Display/headings: **Space Grotesk Variable**, then UI/system sans fallback.
- Body: **IBM Plex Sans Variable**, then UI/system sans fallback.
- Code/labels: **IBM Plex Mono**, then UI mono, SF Mono, Menlo, Consolas.

The current cinematic mapping inherits these families. Its display leading is 1.02 and tracking −0.03em; normal leading is 1.6. Preserve source-specific sizes and weights instead of applying cinematic title settings to every page. Bundled fonts include unmodified package CSS and their original OFL notices. No substitute font or font redrawing was introduced.

## Motion

Authority: `src/styles.css` and `src/cinematic/design/mlai-ds-tokens.css`.

- Shared ease-out: cubic-bezier(0.22, 1, 0.36, 1). Cinematic ease-in-out: cubic-bezier(0.65, 0, 0.35, 1).
- Cinematic duration tokens: fast 180ms, base 300ms, slow 500ms.
- Home provenance chain: 900ms with 150ms delay, disabled under prefers-reduced-motion.
- Existing chip interaction: 180ms; flow-line dash: 1.9s linear. Reduced motion disables the flow animation and chip transforms.

These are documented existing behaviors, not permission to animate every brand application. Native controls, keyboard access, readable contrast and reduced-motion behavior remain part of site acceptance. Films keep captions and transcripts. The package does not add animation to the exported mark.
