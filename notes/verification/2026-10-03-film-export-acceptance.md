# Film export acceptance — 2026-10-03

**Current:** six local narrated H.264/AAC exports, showcase integration, captions/transcripts/chapters/posters, complete decode/playback evidence, and all required local gates. **Partial:** human listening/creative approval and immutable model-weight provenance. **Out of scope:** remote publication.

Checkout: canonical quesar.cloud, main at ac8c24afe618f34a7ed46ea0baed477133064c40, with preserved existing dirty work. No commit, push, deployment or remote publication.

## Delivered media

All six movies are 1920×1080, 30 fps, with 24 kHz AAC narration. Each MP4 is below 100 MiB. Total: 19,890 decoded frames, 663 seconds (11:03), 110 measured cues and 196,123,453 MP4 bytes.

| Film | Seconds | Decoded frames | Cues | MP4 bytes |
| --- | ---: | ---: | ---: | ---: |
| [film](../../public/media/films/film.mp4) | 69 | 2,070 | 15 | 3,688,233 |
| [trailer](../../public/media/films/trailer.mp4) | 62 | 1,860 | 17 | 3,374,048 |
| [abbey](../../public/media/films/abbey.mp4) | 38 | 1,140 | 9 | 9,294,970 |
| [explainer](../../public/media/films/explainer.mp4) | 132 | 3,960 | 23 | 76,319,260 |
| [mega](../../public/media/films/mega.mp4) | 282 | 8,460 | 38 | 90,286,650 |
| [design](../../public/media/films/design.mp4) | 80 | 2,400 | 8 | 13,160,292 |

[Artifact manifest and hashes](../../public/media/films/manifest.json) · [offline review player](2026-10-03-film-review.html) · [brand release index](2026-10-03-brand-release-index.md) · [brand manifest](2026-10-03-brand-release-manifest.json).

The output directory contains 42 per-film assets plus the manifest. The brand inventory references 77 canonical existing assets/source files without duplicating them. The offline HTML player was opened directly through file:// with all HTTP requests blocked: video played, 15 embedded captions loaded in the first film, and zero network requests occurred. Full media verification covered all six films separately.

## What changed

- Recovered five existing Kokoro exports only after matching their current catalog hash, exact cue text, captions, transcripts, chapters and measurements. Original artifacts remain intact.
- Finished mega from retained neural PCM: every current cue field, sample duration, peak, silent gap and tail was checked. The three latest retained PCM files were byte-identical. PCM SHA-256: 0d4849a9c0ba82c10b4d3217c470024f7fc647b6db0490d34bbddac5f148b0a6. No voice fallback, time stretch or fresh model download was used.
- Fixed the previous render deadline/file-size failures with duration-aware bitrate, two FFmpeg encoding threads, a bounded one-second-per-frame allowance, and faster lossless Chromium PNG transport. Mega rendered all 8,460 frames in 1,395.521 seconds; final size 90,286,650 bytes.
- A transport comparison at mega frame 3000 produced identical decoded pixels with both screenshot methods. SHA-256: 2884d62e4dd009a43ce1f2d06b55c80c08b77f200036bcd4e4a96b9924c0251c. Five-frame timings were 251.48 versus 152.87 ms/frame; this sample does not establish full-film determinism.
- Derived informative posters from each actual movie’s first-chapter midpoint. Inspected first/middle/last decoded frames for all films and the six-player showcase.
- Added on-demand native players with AI-narration labels, English captions, MP4/VTT/transcript links and recovery after media failure. Existing teasers and interactive rooms remain available.
- Browser acceptance exposed a binary corruption bug: TanStack followed MP4 download links and rewrote response bytes as UTF-8. The media subtree is now excluded from page prerendering. The static gate compares referenced media with original public bytes, with a regression proving it rejects both UTF-8 expansion and equal-size corruption. All 42 final static film artifacts match the source manifest hashes.

## Verified commands and results

| Command / check | Result |
| --- | --- |
| node artifacts/film-completion-20261003/resume-mega.mjs | Exit 0; complete 282-second render from verified retained PCM |
| node artifacts/film-completion-20261003/verify.mjs mega | Exit 0; the verifier loops all six catalog entries |
| ffprobe -count_frames and ffmpeg -xerror full A/V decode | All six pass, exact frame counts |
| Decoded PCM inspection | 110 audible cues; no clipping; no audio above 0.002 amplitude outside cue windows plus 60 ms AAC margin; silent tails |
| Complete Chromium playback | All six reach ended at 16×, muted, without media errors; first/middle/last seeking verified |
| Capture caption audit | All 110 exact current captions present at their scheduled frames |
| bun run check | Exit 0; format, typecheck, lint, 88 Vitest files / 724 tests, production build |
| bun run build:static | Exit 0; regenerated docs/ through the documented build |
| bun run check:static | Exit 0; 129 HTML pages, all preload/gzip budgets pass, media bytes checked |
| bunx playwright test e2e/narrated-films.spec.ts | Exit 0; 6 / 6 cases in desktop, mobile and short-mobile |
| bun run test:e2e | Exit 0; 226 / 226 cases, including accessibility, reduced motion and room lifecycle/voice failure |
| git diff --check | Exit 0 |

Raw logs, full verification JSON, screenshots, retained-operation scripts and the before-edit film-pipeline copies live in artifacts/film-completion-20261003/. The temporary verification server on port 4201 is stopped after acceptance; the pre-existing servers were not stopped.

## Remaining boundaries

- Human listening, pronunciation and creative approval were not performed. Muted accelerated playback and numerical audio checks do not claim those results.
- Receipts identify Kokoro model ID, q8 dtype, WASM device, voice, speed, text hashes and actual sample counts, but do not pin immutable model weights. Earlier encoded artifacts did not record an encoder version; that provenance is not fabricated.
- The cue catalog’s draft/export-planning fields remain the exact synthesis input provenance. Current artifact status is recorded in the output manifest. Source/vision labels do not establish deployed product, security or research claims.
- The local brand inventory records the earlier asset-index stage. Subsequent [brand package acceptance](2026-10-03-brand-package-acceptance.md) records the completed reproducible distribution and source-derived site-mark SVG, with a later 89-file / 744-test gate; the 88-file / 724-test result above remains the film-delivery snapshot. A separately approved primary-logo master and final design/claims and rights approval remain separate work.
- No remote release or publication was performed.
