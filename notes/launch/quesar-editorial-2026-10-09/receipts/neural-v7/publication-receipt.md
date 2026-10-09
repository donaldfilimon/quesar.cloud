# Publication and local server artifact receipt — 2026-10-09

PR 38 merged at 11:33:23 UTC as `554ded11f7aa1b906bb9195f0e0f767cab8999f1`. GitHub Pages reports that exact commit built at 11:34:02 UTC. The new release was published at 11:30:31 UTC with sixteen MP4s and one provenance ZIP; all seventeen assets matched local hashes and byte lengths.

The actual public showcase passed all sixteen selected film URLs, short muted playback, advancing clock and decoded frames, 1080p metadata and expected durations, loaded captions, no media errors, four duration filters, mobile overflow checks and the manually invoiced services offer. Full-duration viewing and subjective listening remain pending.

The persistent server rebuilt from `975fcc7fdf597fb5c407268055aee9e9f07a25a6`, whose source tree matches the publication merge. The `.output` artifact contains 715 files totaling 243,438,771 bytes. The receipt records each file hash. With production identity configuration and NODE_ENV absent, the loopback `/api/readiness` and `/` routes both returned 503 with `Cache-Control: no-store`. The verification process stopped afterward. No production host, credentials, migrations, native WDBX connectivity, real OAuth or funds were established by this artifact check.

The private render and review evidence is preserved separately before plan-workspace cleanup. Earlier release media and historical render versions remain available. The unrelated Python-worker lockfile edit is preserved.
