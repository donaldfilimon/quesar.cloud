# Quesar editorial films — 2026-10-09

Dedicated deterministic React films in two visual editions: cream/copper architecture and ink/copper studio. Each edition has 60, 120, 180 and 600 second cuts. The ten minute cut comprises 30 unique source-backed chapters. It does not repeat a shorter cut.

Source: `chapters.json`, `main.jsx`, `style.css`. Narration: macOS Samantha, 155 words/minute. Video: 1920×1080 H.264, 30fps output; animated React samples are captured at 10fps. The output repeats each sample for three encoded frames, so these are not native 30fps motion renders. Audio: AAC, 48kHz. Each output directory includes MP4, WebVTT captions, source-qualified transcript, timeline, sample JPEGs, narration intermediates and ffprobe/full-decode verification.

Content is a website/product orientation. Diagrams are illustrative, not traces from a running provider. Quesar's broader website/model direction and Quasar's separately configured local builder remain distinct. Local service behavior is described from source, not claimed as verified in a running service. Proposed Studio, multimodal collaboration and Network chapters carry VISION / ROADMAP labels.

Commands from repository root:

```
node node_modules/vite/bin/vite.js notes/launch/quesar-editorial-2026-10-09 --config notes/launch/quesar-editorial-2026-10-09/vite.config.mjs
node notes/launch/quesar-editorial-2026-10-09/test.mjs
node notes/launch/quesar-editorial-2026-10-09/verify.mjs
node notes/launch/quesar-editorial-2026-10-09/render.mjs
```

The renderer skips only outputs with a completed verification receipt. An interrupted unverified output is re-rendered. `render.log` reports progress. No new dependencies or production source changes. Root repository gate and publishing are owned by the primary agent.

Verification: browser layout checks cover each selected chapter in every duration and edition (108 checks); renderer validates dimensions, frame count, exact duration, and full ffmpeg decode. Representative images must be manually inspected. Listening is unverified unless explicitly recorded after playback. Do not claim review acceptance from ffmpeg decoding alone.

## Final masters at native 30fps

Final delivery uses `render-native30.mjs`, which captures every frame at 30fps and writes to `artifacts-native30/<id>/<id>.mp4`. The original `artifacts/` videos are previews only. Two 60-second previews completed verification; the original preview batch was stopped deliberately to devote rendering to final motion quality. Any preview without `verification.json` is incomplete and must not be published.

```
node notes/launch/quesar-editorial-2026-10-09/render-native30.mjs
```

Native rendering progress is in `render-native30.log`. Only publish a final master once its own `verification.json` exists and confirms `renderSamplingFps: 30`.
