# Six source-film re-export qualification — 2026-10-09

**Current:** technical qualification of the exact six assets from `444eb88855be95aa384984612eba9611f2e543f3`: capture, full decode, measured audio boundaries, complete muted Chromium playback, source-derived captions/transcripts/chapters and static/browser integration pass. **Current:** final root gate passes 102 files / 819 tests after a concurrent writer corrected the unrelated contact assertion. The earlier root failure is retained. **Pending:** full listening, pronunciation/naturalness/pacing, perceived clipping, full-motion and creative approval, and immutable model-weight provenance. **Out of scope:** remote publication, provider and deployment acceptance.

No re-export defect was found; no production source or film asset was repaired. This task made no commit or push. It created this report and its evidence, ran local checks, and preserved generated output snapshots under `/tmp/quesar-reexport-444eb888-snapshots/`. These are disposable generated copies; unique review evidence remains in this report directory.

## Baseline and identity

Baseline is the finishing ledger's final qualified receipt, `notes/verification/2026-10-09-finishing/evidence/implementer-trailer-final-hashes.json`, observed 2026-10-09 19:02:29.921 UTC (15:02:29 EDT), baseline commit `d154e480760706a39745d9b5299dd1be8a8d0f5d`. The ledger's final refreshed source fingerprint was `891ca37676728aa25fd1113fe708e7735d6b734c2b5db5fdf56735bcc14d00f3`; historical hashes are compared, not treated as acceptance of new bytes. The separate 16-film v7 collection in `film-review.md` is not these six source films.

All 43 current files in `public/media/films` match commit 444eb888 exactly. All 42 declared per-film artifact hashes and byte counts match their current manifest. Against the ledger baseline, 23 files changed: six MP4s, six posters, six encoding receipts, four timing receipts (film, abbey, explainer, mega), and the manifest. The other 20 files are unchanged, including all captions, transcripts, chapters, and trailer/design timing receipts. All 114 relevant cinematic, playback, exporter and film-harness source files match the qualified baseline. [Full asset comparison](evidence/asset-comparison.json) and [source comparison](evidence/capture-source-comparison.json).

| Film | Baseline SHA-256 | Current SHA-256 | Bytes before → after |
| --- | --- | --- | --- |
| abbey | `7abdf1a9f0674d41f7c523d7fea765165ac2033a79a963722a24b09d88c633f3` | `2fe720a5f4657f528c4a2e536e73afb8e7352f90249521ab377e9b3f59f1c8d0` | 9,294,970 → 9,354,450 |
| design | `bb863dc3f2b6a61e6ca43080615c920f383d5007ad0399aa504bd2f393090867` | `389c8f257fcd9b04698ccdd7e7897fb2de5d005559389c69e438de66af795019` | 13,160,292 → 8,658,497 |
| explainer | `2f5699b9c1d1c4239ebfee923287501a60e6c700df5c1723beac66ae3871f570` | `66599be9151229b1d564032632e3932a284605b2acdca65cb5c965692fff53dc` | 76,319,260 → 73,602,812 |
| film | `0e571bbe801f1e21a41f0d976b7a9cfccda6818f2026f1208ceac225450eed38` | `c5837c211e692dd7f78b656fcb327f1e09822fff798f01403e8755329c9129ac` | 3,688,233 → 3,693,774 |
| mega | `8a76ff8b52b78276119205e272c067c62f57d0396b8829810203ead72788d65c` | `26ad9ad5aafaf7af935e484a6c6340cea796e418335685cacd48777e26252c39` | 90,286,650 → 90,295,529 |
| trailer | `4bda27069214e6d70e423aab60430af0023596a727a4c3d743902358bd674e51` | `1716e607151714711201350d09881872fe6926a8a52bc334beafdd15c1706deb` | 3,374,048 → 3,382,309 |


All six remain 1920×1080 H.264, 30 fps, AAC at 24 kHz; exact 19,890 decoded frames, 663 seconds, 110 cues. MP4 total decreases from 196,123,453 to 188,987,371 bytes; every MP4 remains below 100 MiB. No audio peak reaches 1.0; every cue is audible under the retained RMS threshold, and no gap exceeds 0.002 amplitude outside the 60 ms AAC margin. [Per-film probe/audio/playback results](evidence/verification.json). All 110 catalog cues, exact VTT, transcripts, and chapter arrays match current sources. Additional pronunciation receipts match the current `pronounce()` function and persona configuration; this does not establish spoken pronunciation quality.

## Documented gates and exact commands

Commands ran in the canonical checkout. Bun commands use `PATH=/opt/homebrew/bin:$PATH`: Bun 1.4.3, avoiding the default PATH's unsupported Bun 1.4.0. No dependencies were installed or changed. Gate definitions: `CLAUDE.md`, `notes/verification/2026-10-03-film-export-acceptance.md`, and the finishing ledger's 24 capture + 1 disabled-guard baseline. The verifier is a retained copy of `artifacts/film-completion-20261003/verify.mjs`, changing only absolute import paths, evidence directory and loopback port; historical evidence is preserved.

| Exact command | Exit | Observed result |
| --- | ---: | --- |
| `PATH=/opt/homebrew/bin:$PATH bunx playwright test --config e2e/film/playwright.config.ts --project capture` | 0 | 24 passed / 4.7m; [capture.log](evidence/capture.log) |
| `PATH=/opt/homebrew/bin:$PATH bunx vitest run scripts/export-films.test.ts scripts/narrated-film.test.ts src/components/site/narrated-films.test.tsx` | 0 | 3 files / 6 passed; [film-unit.log](evidence/film-unit.log) |
| `node notes/verification/2026-10-09-reexport-444eb888/evidence/verify.mjs` | 0 | 6 full decodes and complete muted 16× playbacks; 110 audible cues; [decode-browser.log](evidence/decode-browser.log) |
| `node notes/verification/2026-10-09-reexport-444eb888/evidence/verify-pronunciation.mjs` | 0 | 110 text/pronounced hashes, voices, speeds, sample durations match; [pronunciation.log](evidence/pronunciation.log) |
| `FILM_CAPTURE_BUILD=0 bunx playwright test --config e2e/film/playwright.config.ts --project capture-disabled` | 0 | 1 passed; [guard.log](evidence/guard.log) |
| `bun run check` | 1 | format/typecheck/lint pass; 101 files pass, 1 fails; 816 tests pass, 1 fails; build skipped; [root-check.log](evidence/root-check.log) |
| `bun run build:static` | 0 | built docs; [static-build.log](evidence/static-build.log) |
| `bun run check:static` | 0 | 129 HTML pages; all four budgets pass; [static-check.log](evidence/static-check.log) |
| `bunx playwright test e2e/narrated-films.spec.ts` | 0 | 6 passed / 9.5s; [narrated-browser.log](evidence/narrated-browser.log) |
| `bun run test:e2e` | 0 | 226 passed; [full-browser.log](evidence/full-browser.log) |
| `git diff --check` | 0 | no whitespace errors; [diff-check.log](evidence/diff-check.log) |
| `PATH=/opt/homebrew/bin:$PATH bun run build` | 0 | standalone production build passes; [production-build.log](evidence/production-build.log) |
| `PATH=/opt/homebrew/bin:$PATH bun run check` (intermediate retry) | 1 | ESLint scanned task-generated snapshots under artifacts; [root-check-current.log](evidence/root-check-current.log) |
| `PATH=/opt/homebrew/bin:$PATH bun run check` (final retry) | 0 | format/typecheck/lint, 102 files / 819 tests, production build; [root-check-final.log](evidence/root-check-final.log) |

The copied verifier runs these commands for every master (all successful):

```text
ffprobe -v error -threads 2 -count_frames -show_streams -show_format -of json public/media/films/<id>.mp4
ffmpeg -v error -xerror -threads 2 -i public/media/films/<id>.mp4 -map 0:v:0 -map 0:a:0 -f null -
ffmpeg -v error -threads 2 -i public/media/films/<id>.mp4 -vn -f f32le -ar 24000 -ac 1 pipe:1
```

Verification serving command: `E2E_STATIC_ROOT=public/media/films E2E_PORT=4218 node scripts/serve-static.ts`. Started successfully, then deliberately stopped with Ctrl-C after verifier completion (process exit 130); port 4218 has no remaining listener. Playwright manages its own isolated capture and static preview servers. No pre-existing server was stopped.

Static budgets: `/` 17/21 preloads, 163740/225362 gzip bytes; `/docs/` 17/21, 166607/264643; `/research/` 19/23, 185413/247971; `/developers/` 22/25, 173189/235878. All 43 generated film files equal their public sources. 283 external references were excluded from network checks. [Static film equality](evidence/static-film-byte-comparison.json).

## Failure attribution and preservation

`bun run check` exits 1 at `src/routes/-public-renderer.test.tsx:102`: it expects “local receipt records acceptance by the site”, while the existing uncommitted `src/routes/contact.tsx` now renders “A local receipt records acceptance when device storage is available.” Commit 444eb888 changes only media files. The contact source and mismatch were already present at task start. This is unrelated to the re-export and is preserved; no assertion or contact behavior was edited by this task to make the gate green. The remaining production build was run separately and passes. The external writer subsequently corrected that assertion; final `PATH=/opt/homebrew/bin:$PATH bun run check` exits 0, with 102 files / 819 tests and production build passing. This task did not edit the contact route or assertion.

The initial diff and status are retained in evidence, along with hashes of 237 existing dirty/untracked files. 7 existing files changed concurrently: `notes/verification/2026-10-09-auth-contact-review.md`, `notes/verification/2026-10-09-finishing/contact-auth-implementation.md`, `src/routes/contact.test.tsx`, `e2e/backend/persistent.acceptance.ts`, `src/lib/internal.test.ts`, `src/lib/internal.ts`, `src/routes/contact.tsx`. This task did not write them; their latest contents remain intact. The concurrent writer also edited the previously failing public-renderer assertion after the first gate; the final fresh current root gate passes. All 43 film hashes stayed stable through acceptance.

A separate writer committed `4d2d028c0a9f44914116bd34f122ea61121b4ed0` during browser qualification, including these task evidence files and the generated docs. This task did not invoke a commit or push. The initial docs snapshot was first restored, then the concurrently committed docs were restored from exact `git archive` bytes after discovering the moved Git boundary. The concurrent committed docs exactly match the qualified static snapshot, and browser-start/final docs hashes match. No docs diff remains. Both original and qualified snapshots are retained. [Concurrent preservation receipt](evidence/concurrent-docs-preservation.json) and [final preservation](evidence/final-preservation.json).

The requested `cd "$(git rev-parse --show-toplevel)" && git clean -d --interactive` was opened. Its first stale candidate list was quit with option 5 (exit 0), then reopened after docs preservation. The second prompt remains awaiting a selection; no clean/delete action has been taken. Its remaining candidates are newly generated qualification evidence. Deleting them would discard current receipts.

## Remaining review gaps

Complete playback was muted and accelerated at 16×. First/midpoint/final seeking was machine-verified for each export; six midpoint stills were visually inspected with readable labels/captions and no obvious sampled defect. This is not full motion or full listening approval. Capture determinism covers selected/revisited frames, required-font failure/recovery, title holds, Design boards, and lifecycle/deadline cases; it does not establish pixel determinism for every encoded frame. No fresh synthesis or immutable model-weight pin was performed. The original export manifest's browser flag remains its historical statement; new playback acceptance is recorded here against exact hashes without rewriting generated provenance. Remote release downloads, publication and public TLS/provider checks were not performed.

The intermediate root retry failed because these task-generated backup copies were placed under `artifacts/`, which ESLint does not ignore (22,878 generated-code problems). This orchestration defect was repaired by moving only the three generated snapshots outside the checkout; no configuration or source was changed. The final gate then passed. Static/browser qualification binds the unchanged film source and exact concurrently committed docs; later unrelated contact-source edits are covered by the final root gate, but are not promoted to new static/browser acceptance.

Fresh sample-rate confirmation: `ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of json public/media/films/<id>.mp4` exits 0 for every master; all six report 24000 Hz. [Exact commands and results](evidence/sample-rate-check.json).
