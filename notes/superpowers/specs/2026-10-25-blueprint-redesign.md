# Blueprint instrument: visual redesign of the shell, home and shared primitives

Chosen by Donald on 2026-10-25 from three presented directions (Swiss editorial, product console, blueprint instrument). Scope: shell, home and the shared primitives that key pages inherit; publish to the live site.

## Direction

The site reads as a technical drawing of the stack: drafting-paper grid, navy ink, cyan trace lines, amber annotations. It replaces the dark neural-field hero and the slate "titanium" palette. Fonts are unchanged (Space Grotesk display, IBM Plex Sans text, IBM Plex Mono for labels and data), so no new dependency.

## Tokens (`src/styles.css`)

| Role | Light | Dark |
|---|---|---|
| Page ground | `#EDF2F7` drafting paper | `#061220` night blueprint |
| Card | `#FAFCFE` | `#0B1B2D` |
| Ink | `#0B1B2B` | `#E4EDF6` |
| Muted / subtle text | `#3B4F63` / `#4A5F74` | `#A3B6CA` / `#8EA4BB` |
| Trace (primary, ring) | `#075E7E` | `#56C8EC` |
| Annotation, partial | `#8A4B00` | `#F2B35C` |
| Field outline | `#687F99` | `#557EA6` |

Every text token is ≥ 4.5:1 on page, card and muted grounds; ring and field outlines ≥ 3:1. `src/lib/contrast.test.ts` enforces this, now for light, dark, and (text and ring only) the film palette. `.mlai-ds` keeps the previous dark palette so the cinematic rooms match their captured exports. Radius drops to `0.3rem`.

## Primitives

- `.bp-grid`, `.bp-grid-fade`: 24px minor / 120px major grid; the fade variant sits behind hero content and fades out downward so body text never sits on lines. `PageHero` uses it, so all inner pages inherit it.
- `.bp-frame`, `.bp-ticks`, `.bp-dashed`, `.bp-frame-head`: drawn objects with registration corners. Dashed outlines mark anything not built yet (planned, vision, development), so the outline carries the status alongside the badge.
- `.eyebrow`: mono annotation with a registration square; `.bp-index` numbers home rows 01–11.
- `.bp-label`, `.bp-note`: mono margin notes; amber only when qualifying a claim.
- `.site-header`: translucent paper with backdrop blur; solid fallback.

## Home

- Hero: sheet strip, the existing copy, and `RequestSchematic` (`src/components/site/request-schematic.tsx`), an SVG of the conceptual request flow already stated on the page (context, ABI routing, selected persona, WDBX underneath). Trace lines draw in once; off under reduced motion. Caption keeps the "conceptual, not separate services" boundary.
- Ecosystem roles and engagement paths are framed spec panels; roadmap and research directions are dashed.
- No copy changed. Status badges and VISION/ROADMAP labels are untouched.

## Verification

`bun run check` (pre-existing environment-only failures noted in the PR), `build:static`, `check:static` with unchanged budgets, `test:e2e`, and screenshots at desktop and mobile in both themes.
