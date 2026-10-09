# Ecosystem trailer acceptance — 2026-10-03

Current: all three 1080p films are rendered, technically verified and inspected at every chapter midpoint plus the first, middle and final frame. Six products remain distinct, readable and explicitly labeled concept illustrations.

| Cut  | Frames | Audio LUFS |  True peak | MP4 SHA-256                                                        |
| ---- | -----: | ---------: | ---------: | ------------------------------------------------------------------ |
| 90 s |   2700 |     -18.00 | -5.86 dBTP | `3726350e923b96a062553b324e3f997f6e3e542607812caab26be4426dccb380` |
| 30 s |    900 |     -18.00 | -7.93 dBTP | `078be322735464ff2579b88211214a7ee14a965ac4e3384e0d47d4b8a2313d0c` |
| 15 s |    450 |     -18.01 | -7.63 dBTP | `2190da54ada56e94ce526131a5884ec97a2866d6c37b5bb6ca5567c544c735b1` |

All are 1920 × 1080, 30 fps, H.264/yuv420p with limited TV range, stereo 48 kHz AAC and faststart. Full audiovisual decoding exited 0 for each. Scores are original standard-library synthesis; each cut has its own phrasing and standalone WAV.

The six portable contracts and the real JPEG-to-H.264 regression pass. The first master attempt failed the strict color-range check and remains marked unqualified; the corrected source passed independent review and produced all three final cuts from the same eight-file source freeze.

All 16 referenced source-file hashes and 63 preserved original media/brand-source hashes match. Each output manifest and checksum list was independently recalculated. Caption JSON exactly matches the timeline-derived copy; SRT, WebVTT and transcript files are retained for each cut.

Native Chromium playback loaded correct metadata, started only on explicit muted play, advanced and reached the end at 8× for every final MP4 without errors. The actual root-owned gallery also passed: no initial autoplay; all three videos loaded and played to completion; no console, page or media errors; no horizontal overflow at 1440 or 390 pixels; all file links resolved. Optional file-origin tracks were removed by the gallery owner, retaining burned captions and transcript links. Its prior failure receipt is preserved. No browser security flag was changed.

No human listening or full-pace creative review is claimed. These are film artifact checks, not product deployment or integrated-runtime acceptance. No existing media, product source, route or brand asset was edited by this task. No commit, publication, package install or external service call occurred.

Exact machine evidence: `delivery-acceptance.json`, `browser-playback.json`, `gallery-playback.json`, `preflight-after-range-fix.json`, range regression logs, per-cut reports/manifests and the retained original-file snapshot.
