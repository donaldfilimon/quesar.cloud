# MLAI / Quesar trailer editions

Eight editorial cuts of the site's existing React cinematic exports, at
1920 × 1080, 30 fps, H.264 with AAC narration. Two distinct editions per
requested duration: 60, 120, 180 and 600 seconds. The long editions sequence
five films without repeating or stretching footage. Original source and
vision labels remain visible. These edits retain the existing visual system;
they do not yet implement a new Claude-inspired art direction or dedicated
Quesar website walkthrough.

`render.py` owns only this directory. It refuses existing artifact directories,
checks cue boundaries, retimes captions and transcripts, records source hashes,
checks exact frame counts and audio duration, and performs full video/audio
decode. `verification.json` distinguishes those checks from visual and listening
acceptance. Source films remain untouched in `public/media/films/`.

Run from this directory:

```sh
python3 test_render.py
python3 render.py --preflight
python3 render.py                  # all eight, only into absent directories
python3 render.py --cut kinetic-60 # one selected edition
```

Serve this directory over loopback HTTP to use `index.html`. Each card links
its MP4, subtitle file, transcript and verification receipt. Nothing is
published or uploaded by this workflow.
