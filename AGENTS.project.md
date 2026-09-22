# Project instructions (quesar.cloud)

These are Donald's standing instructions. Grok's `AGENTS.md` loads this file with equal priority.

- **This is the main MLAI/Quesar site as of 2026-09-22.** It supersedes
  `donaldfilimon/MLAI-CORPORATION-WWW` (local checkout `~/dev/active/mlai`,
  Next 16), which is now the port source only. Port features from there, and
  don't build new site work in it.
- **The cinematic showcase lives in `src/cinematic/`.** It was ported from
  `mlai/apps/mlai/src/{film,trailer,abbey-trailer,explainer,mega,design}` plus
  `components/CinematicShell.tsx`. The playback core is
  `src/lib/trailer-engine/`, vendored from `mlai/packages/trailer-engine`. The
  six `/showcase/*` rooms are `ssr: false` routes that lazy-load
  `src/cinematic/rooms/<room>.tsx`. `src/components/site/trailer.tsx` (the MP4
  player) remains the `/showcase` and home teaser.
- `CinematicShell` portals to `<body>`, because the route wrapper
  `.page-enter` keeps a transform that would trap `position: fixed`. Keep the
  portal.
- Narration loads Kokoro TTS from jsdelivr at runtime and falls back to Web
  Speech. The films are orientation, not benchmarks, so keep their
  VISION/ROADMAP labels.
- Local development: `npm ci`, then `npm run typecheck`, `npm run lint` and
  `npm run build`.
  - The 13 `npm test` failures in `scripts/*.test.mjs` are Grok-sandbox
    template tests. They fail on macOS with or without app changes.
  - `npm run build` rewrites the tracked `.vercel/output/`. Never commit it by
    accident.
- Grok exports push to `main`. Always `git fetch` before pushing, and never
  force-push.
