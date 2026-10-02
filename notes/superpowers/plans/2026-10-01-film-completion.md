# Film Collection Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development. No commits unless separately authorized.

**Goal:** Six finished interactive films and real narrated exports.
**Architecture:** Shared typed cue catalog and controlled Stage capture; browser renderer and FFmpeg encoder.
**Tech Stack:** React, existing trailer-engine/Kokoro, Playwright, FFmpeg.
**Spec:** notes/superpowers/specs/2026-10-01-site-completion-design.md

## Global Constraints
1920x1080 30fps H.264; preserve portal, lazy Kokoro, silent fallback, evidence labels and WebM teasers. No new production deps or commits. Implementers never spawn agents.

## Review Focus
Unloaded fonts; nondeterministic canvas frames; narration overruns; last-frame capture; voice failure/navigation leaks.

### Task 1: Scripts and cue catalog
Files: src/cinematic/film/*script*, cinematic rooms, new cue catalog, notes/verification/film-production-briefs.md.
- [ ] Inventory each existing narrative; six briefs, typed cue interfaces and audited refreshed scripts; design walkthrough.
- [ ] Validate nonnegative ordered cues within durations and transcript/caption equivalence.

### Task 2: Deterministic capture and playback
Files: cinematic Stage/timeline/renderers and scripts/export-films.ts; capture tests and e2e/rooms.spec.ts.
- [ ] Test explicit capture seek, deterministic scene output, hidden chrome, no persistence and cleanup.
- [ ] Implement controlled clock and frame rendering without affecting normal playback; capture only trusted loopback build.
- [ ] Browser playback/seek/voice failure/visibility/reduced motion for every room; review.

### Task 3: Narration and full exports
Files: scripts/export-films.ts, public/media/films/, media declarations and showcase route.
- [ ] Render timed narration with existing Kokoro, compose audio and encode all six films; derive captions/transcripts/chapters/posters from cues.
- [ ] ffprobe codec/dimensions/rate/audio/duration; verify actual first/middle/end frames and audio synchronization. Add playback/download controls with on-demand loading.
- [ ] Inspect all assets and browser playback; gate/static budgets; claims audit and review.

## Preflight corrections (binding)
- Audit every spoken/on-screen assertion by cue ID and source SHA before synthesis. Rewrite universal/tamper/security claims in narration itself, not just badges.
- Design: finite 80-second walkthrough, eight existing boards in order brand/system/showcase/hero/lab/marketing/console/docs, ten seconds each; explicit board readiness and repeatable scroll shot. Keep Explore action for original hub. Pause/seek/replay/export use the same shot catalog.
- Export synthesizer returns PCM samples and sample rate per audited cue, uses existing Kokoro model and persona voices, records actual durations; fail on cue overruns rather than truncate or silently render without narration.
- Capture frame i at i/30 through ceil(duration*30)-1. Stream PNG frames to FFmpeg to bound scratch disk (35GB available); manifest model/voice/prosody/seed/encoder/cue data. Inspect decoded frame count and audio tail.

- Delivery constraint: keep each tracked MP4 below GitHub's100MiB single-file limit and overall deploy assets within host limits. Prefer CRF22 with bounded bitrate; measure final file size and inspect decoded quality before acceptance. Do not silently substitute a shorter film or low-resolution export.
