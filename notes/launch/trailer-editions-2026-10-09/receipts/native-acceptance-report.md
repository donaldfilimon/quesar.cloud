# Native final browser acceptance

2026-10-09T08:23:56.011Z

Status: passed. 8/8 discovered completed films passed; 0 failures; 0/8 editions skipped as incomplete.

Checks: Chromium decoded playback at 1920×1080, duration tolerance 0.06 s, nonempty captions with valid timings, midpoint and final-second seeks, screenshots. This is sampled browser acceptance; full-duration browser playback and subjective listening/visual review remain unverified. Renderer verification.json supplies separate full FFmpeg decode evidence.

- quesar-architecture-60: passed; 4 caption cues; 183 decoded frames; 2 seeks
- quesar-architecture-120: passed; 8 caption cues; 134 decoded frames; 2 seeks
- quesar-architecture-180: passed; 12 caption cues; 334 decoded frames; 2 seeks
- quesar-architecture-600: passed; 30 caption cues; 234 decoded frames; 2 seeks
- quesar-studio-60: passed; 4 caption cues; 184 decoded frames; 2 seeks
- quesar-studio-120: passed; 8 caption cues; 134 decoded frames; 2 seeks
- quesar-studio-180: passed; 12 caption cues; 334 decoded frames; 2 seeks
- quesar-studio-600: passed; 30 caption cues; 234 decoded frames; 2 seeks


Browser errors: []. Own loopback server PID 44940, http://127.0.0.1:59320, serving /Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts-native30; closed on teardown. Every video source was cleared and load() called before the next film.

Rerun: node notes/launch/quesar-editorial-2026-10-09/verify-native-video.mjs
