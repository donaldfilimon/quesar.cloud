# Ecosystem trailer — 2026-10-03

Editable, offline 90-second concept film covering WDBX, ABI, Abbey, Abbey Bot,
Quesar / MLAI and WebPress, plus separately paced 30- and 15-second derivatives.
The delivery is confined to this directory. No site route or existing media is
changed, and no publication is performed.

## Files and ownership

- `STORYBOARD.md`: shot list, motion direction, copy boundaries and acceptance.
- `timeline.json`: editable copy and exact scene holds for all three cuts.
- `claims.json`: source paths, line locations, content hashes and source limits.
- `film.html`: deterministic Canvas/DOM animation, with a local preview control.
- `render.py`: original score synthesis, capture, captions and media validation.
- `test_render.py`: focused portable timeline, captions, output and media tests.
- `test_color_range.py`: real FFmpeg regression for JPEG-to-H.264 color range.
- `captions/`: generated JSON, SRT, WebVTT and transcripts per cut.
- `artifacts/{90s,30s,15s}/`: MP4, WAV, decoded stills, poster, contact sheet,
  report, manifest and SHA-256 list per cut.
- `receipts/`: pre-existing media hashes, previews, reviews and final evidence.

## Reproduce

Uses the installed Python 3.14, Playwright 1.63 with cached Chromium, FFmpeg and
FFprobe. No dependency is installed. Only the standard library and Playwright
are imported by the renderer. Generated JSON uses the repository's installed
Prettier. The renderer launches one browser and bounds FFmpeg codecs to two
threads. It refuses an existing output directory.

From this directory:

```sh
/opt/homebrew/opt/python@3.14/bin/python3.14 -B test_render.py
/opt/homebrew/opt/python@3.14/bin/python3.14 -B test_color_range.py
/opt/homebrew/opt/python@3.14/bin/python3.14 -B render.py --preview
/opt/homebrew/opt/python@3.14/bin/python3.14 -B render.py --cut 90 \
  --ffmpeg /opt/homebrew/bin/ffmpeg --ffprobe /opt/homebrew/bin/ffprobe
/opt/homebrew/opt/python@3.14/bin/python3.14 -B render.py --cut 30 \
  --ffmpeg /opt/homebrew/bin/ffmpeg --ffprobe /opt/homebrew/bin/ffprobe
/opt/homebrew/opt/python@3.14/bin/python3.14 -B render.py --cut 15 \
  --ffmpeg /opt/homebrew/bin/ffmpeg --ffprobe /opt/homebrew/bin/ffprobe
```

To reproduce without replacing a qualified delivery, put these editable source
files in a fresh sibling delivery directory under `notes/launch/`, retain the
relative repository layout, and copy its `receipts/preserved-originals.json`.
Do not remove the qualified output to make room for a rerun. The renderer has
no arbitrary output flag, and every run is local to its own directory.

For interactive source preview, serve this directory with a local static server
and open `film.html`. The preview does not contain audio; the encoded MP4 and
standalone WAV are the score-bearing delivery. Capture itself uses `file:` URLs
and refuses external requests. The local preview control is hidden in capture.

## Capture and music provenance

Each frame is evaluated at `frame / 30`, without a wall-clock animation loop.
Canvas and DOM render directly at 1920 × 1080 using a 1200 × 675 CSS stage and
device scale 1.6. Intermediate frames are JPEG quality 96. An explicit full-to-
limited range conversion produces H.264 at CRF 17, yuv420p, TV range and faststart.
The renderer checks a repeated frame for exact byte
identity and audits text bounds at chapter midpoints and the first/final frame.
Cross-machine bit identity is not promised: system fonts, Chromium and codecs
affect pixels and encoding. Their versions and font selection are recorded.

All geometric marks and choreography are original concept illustrations.
Product names remain their owners' names; no new official logos or blanket
brand-license clearance is claimed. No stock media, screenshots or font files
are redistributed. Existing brand/source files are read for scope only.

The score uses original additive synthesis: sine-based pads, plucks, bass
accents and stereo delays. The 90-second score has a 96 BPM pulse; the two short
scores use 120 BPM. Chords follow each cut's own editorial schedule. The final
second fades. A measured two-pass normalization targets -18 LUFS; encoded audio
must measure between -19 and -17 LUFS and at most -1 dBTP. WAV is 48 kHz stereo
16-bit PCM; MP4 audio is 192 kbps AAC. There is no narration or external service.

Captions are authored visual descriptions, not speech transcription. The JSON
retains nullable timestamp/confidence fields rather than inventing ASR scores.
The same per-cut copy is burned into the film and emitted as sidecars.

## Scope of checks

The six portable tests exercise timing, readable caption holds, refused output
overwrite, media contract rejection and source provenance. Full render checks
add browser sampling, exact frames, full decode, audio bounds and original-file
preservation. Sampled visual acceptance is recorded separately after inspection.
These example-artifact checks do not qualify the Quesar application or any of
the six products. No provider, network deployment or production claim is made.

The additional FFmpeg regression feeds real full-range JPEG frames through the
same encoder command used for delivery and checks decoded pixel format and TV
range. The first 90-second attempt failed this strict pixel-format check; its
unqualified bytes and historical renderer are preserved under
`artifacts/90s-unqualified-range/` and `receipts/render-before-range-fix.py`.
They are excluded from the qualified delivery. Capture provenance is now saved
before validation so a failed check retains the exact source and capture record.
