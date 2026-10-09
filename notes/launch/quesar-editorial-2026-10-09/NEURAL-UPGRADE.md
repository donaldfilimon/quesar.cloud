# Abbey browser-neural showcase production

This is the versioned neural upgrade path. `README.md` and the older native renderer document the preserved Samantha masters. They are legacy outputs, not the new voice pipeline.

From the repository root, using the existing installed dependencies, Chromium and FFmpeg:

```sh
node --test notes/launch/quesar-editorial-2026-10-09/upgrade-cache.test.mjs notes/launch/quesar-editorial-2026-10-09/upgrade-provenance.test.mjs notes/launch/quesar-editorial-2026-10-09/upgrade-edit-boundaries.test.mjs
node notes/launch/quesar-editorial-2026-10-09/test-upgrade.mjs
node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --all --preflight
node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --pilot --version abbey-neural-v7
node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --pilot --version abbey-neural-v7 --verify

# After reviewing that exact pilot:
node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --all --version abbey-neural-v7
# Or select one edition:
node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-kinetic-60 --version abbey-neural-v7
```

The CLI starts and closes its own ephemeral loopback Vite server and browser. No app server, OS voice, paid provider or new production dependency is needed. Explicit export intent loads the existing browser Kokoro model; an unavailable model fails the export.

Outputs are ignored local artifacts at `artifacts/<version>/<id>/`. Each completed directory includes its named MP4, original-text captions and transcript, timeline/edit provenance, representative stills and `verification.json`. Quesar also includes a short transition preview. Existing completed directories are immutable; changed inputs require a new version. Interrupted directories and PCM caches remain inspectable. The 256-entry per-version PCM cache validates actual sample hashes, rates, measured duration, finite nonzero samples, source identity and persona before reuse.

The 16 IDs are:

- `quesar-architecture-{60,120,180,600}` and `quesar-studio-{60,120,180,600}`.
- `mlai-quesar-kinetic-60`, `mlai-quesar-editorial-60`, `mlai-quesar-technical-120`, `mlai-quesar-design-120`, `mlai-quesar-technical-180`, `mlai-quesar-design-180`, `mlai-quesar-technical-600`, `mlai-quesar-design-600`.

Quesar uses the existing `onnx-community/Kokoro-82M-v1.0-ONNX` loader and Abbey `af_heart` persona through `AudioEngine.exportPCM`: pronunciation, sentence-edge fades, persona EQ, bus compression, a 40ms processing tail and recorded peak attenuation. Captions retain readable original text and follow measured speech. Chapters receive intentional pauses and spare runtime; overrun fails without truncation or time stretching. The renderer captures a fresh frame at every 1/30-second timestamp. Hero, evidence, boundary, workflow and closing shots retain source/status labels and explicitly identify illustrative diagrams.

MLAI adaptations retain their complete original browser-neural performances and original edit provenance. The new path applies restrained visual mastering and measured two-pass loudness mastering; it does not claim newly synthesized narration or redesigned source films. Original masters remain available.

Provenance follows repository-local imports and barrel re-exports from the HTML bootstrap, CLI and explicit dynamic voice entrypoint. It hashes HTML, composition, processing modules, CSS and referenced font assets; the same discovery runs initially and before verified status/reuse. Third-party JavaScript dependencies are identified through package manifests/lockfile, not byte hashes of every installed vendor module. Nonliteral dynamic local entrypoints must be explicit manifest seeds. The model's immutable weight revision remains unknown and is recorded as `null`.

Technical verification requires actual SHA256, dimensions, duration, audio duration, exact frame count, full FFmpeg decode and loudness/true-peak measurement. These checks do not establish subjective listening or complete motion acceptance. Receipts leave those reviews pending. V4, V5 and V6 receipts retain their actual historical source identities; v7 adds strict original-cue boundary validation to the corrected bootstrap provenance and needs its own fresh verified outputs. This guide makes no publication or final-batch completion claim.

Adaptation preflight verifies every selected original narration cue is retained exactly once, with unchanged text/performance and its measured duration, wholly inside its source cut. Only scale-relative floating-point roundoff is tolerated; no millisecond/frame/sample-sized allowance permits truncation. Completed version receipts and cached metadata are never relabeled after source changes.
