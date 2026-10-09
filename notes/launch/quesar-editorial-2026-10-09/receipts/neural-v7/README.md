# Neural showcase delivery verification — 2026-10-09

Reviewed source: PR 37, merged as `55db0dae8e98750433831d0f4283659b0a204600`. Render version: `abbey-neural-v7`.

All sixteen masters have exact 1, 2, 3 or 10 minute video durations, 1920×1080 H.264 video at 30 fps, AAC audio, full FFmpeg decode, actual SHA-256 checks and measured audio mastering. Quesar architecture and studio editions use new Abbey browser Kokoro narration through the shared Web Audio export graph and revised editorial scenes. The eight MLAI editions preserve their original neural performances and all 316 cues. The existing model is reused; no new proprietary voice model was trained. Immutable model-weight revision is not established.

The independent audit checks media hashes, metadata, cue boundaries, narration text and source relationships. All sixteen local native-browser samples passed muted playback, clock and decoded-frame advance, loaded captions, midpoint/end seeking and no media errors. These are sampled checks, not full-duration viewing or subjective listening acceptance; both remain pending.

The complete batch exited 0, including a fresh full decode and source/media checks for independently rendered MLAI cuts. The catalog sync validated all sixteen final candidates before writing small posters, captions, transcripts and proof summaries. No new MP4s or model files are added to GitHub Pages.

The draft-release snapshot records sixteen MP4s and a provenance ZIP. All seventeen remote assets matched local SHA-256, byte length and uploaded state. The ZIP contains 66 entries: a manifest, the source guide, and each edition's captions, transcript, timeline/edit and full technical receipt. The manifest records video hashes and sizes; media, PCM, models, caches and partial renders are excluded. The existing release is retained.

The repository gate passed 96 test files and 779 tests plus format, typecheck, lint and production build after catalog sync. Generated Pages publication and final public-browser acceptance are recorded separately when established.

Release target: https://github.com/donaldfilimon/quesar.cloud/releases/tag/trailer-editions-2026-10-09-abbey-neural

Gallery target: https://quesar.cloud/showcase/#editions

WDBX manual invoicing and the persistent Node build are merged, with isolated local acceptance already recorded under `notes/commerce/`. Production host/configuration, real authorized OAuth and funds settlement remain unestablished. Static Pages cannot operate the native ledger; the services offer remains a manually arranged USD 2,500 Pilot engagement.
