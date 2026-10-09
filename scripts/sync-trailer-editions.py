#!/usr/bin/env python3
"""Stage small gallery assets and regenerate catalog only for verified 1080p/30fps masters.
Run from checkout: python3 scripts/sync-trailer-editions.py
Unfinished renders are skipped. Existing published entries are retained if scratch is absent.
"""
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "src/lib/trailer-editions.generated.json"
RELEASE = "https://github.com/donaldfilimon/quesar.cloud/releases/download/trailer-editions-2026-10-09"
existing = json.loads(DEST.read_text()) if DEST.exists() else []
records = {record["id"]: record for record in existing}
candidates = []
for style, seconds in [("kinetic", 60), ("editorial", 60), ("technical", 120), ("design", 120), ("technical", 180), ("design", 180), ("technical", 600), ("design", 600)]:
    name = f"{style}-{seconds}"
    title = {"kinetic": "Kinetic introduction", "editorial": "Editorial introduction", "technical": "MLAI architecture", "design": "MLAI design"}[style]
    candidates.append((name, "MLAI", style, seconds, title, ROOT / "notes/launch/trailer-editions-2026-10-09/artifacts" / name, f"mlai-quesar-{name}.mp4", "encoded_and_full_decode_verified"))
for seconds in (60, 120, 180, 600):
    for style in ("architecture", "studio"):
        name = f"quesar-{style}-{seconds}"
        candidates.append((name, "Quesar", style, seconds, f"Quesar {style}", ROOT / "notes/launch/quesar-editorial-2026-10-09/artifacts-native30" / name, f"{name}.mp4", "full_decode_verified"))

for name, brand, style, seconds, title, folder, filename, expected_status in candidates:
    proof = folder / "verification.json"
    if not proof.exists():
        continue
    receipt = json.loads(proof.read_text())
    video = folder / filename
    streams = receipt.get("probe", {}).get("streams", [])
    visual = next((stream for stream in streams if stream.get("codec_type") == "video"), {})
    valid = (receipt.get("status") == expected_status and video.is_file()
             and visual.get("width") == 1920 and visual.get("height") == 1080
             and visual.get("avg_frame_rate") == "30/1"
             and int(visual.get("nb_read_frames", 0)) == seconds * 30
             and abs(float(visual.get("duration", 0)) - seconds) < .05
             and any(stream.get("codec_type") == "audio" for stream in streams))
    if brand == "Quesar":
        valid = valid and receipt.get("renderSamplingFps") == 30 and receipt.get("outputFps") == 30 and receipt.get("browserErrors") == []
    poster = folder / (f"sample-{seconds * 15}.jpg" if brand == "Quesar" else "middle.jpg")
    captions = folder / "captions.vtt"
    transcript = folder / "transcript.txt"
    valid = valid and all(path.is_file() for path in (poster, captions, transcript))
    if not valid:
        raise SystemExit(f"Invalid or incomplete receipt/assets for {name}")
    with video.open("rb") as source:
        sha = hashlib.file_digest(source, "sha256").hexdigest()
    digest = receipt.get("sha256")
    if not isinstance(digest, str) or re.fullmatch(r"[0-9a-fA-F]{64}", digest) is None:
        raise SystemExit(f"Missing or malformed master checksum in receipt for {name}")
    if digest != sha:
        raise SystemExit(f"Master checksum does not match receipt for {name}")
    target = ROOT / "public/media/editions" / name
    target.mkdir(parents=True, exist_ok=True)
    for source, output in [(poster, "poster.jpg"), (captions, "captions.vtt"), (transcript, "transcript.txt")]:
        shutil.copyfile(source, target / output)
    summary = dict(status=receipt["status"], sha256=sha, probe={"streams": [dict(codec_type="video", width=1920, height=1080, avg_frame_rate="30/1", nb_read_frames=seconds * 30, duration=seconds)]})
    if brand == "Quesar":
        summary.update(renderSamplingFps=30, outputFps=30, browserErrors=[])
    (target / "verification.json").write_text(json.dumps(summary, indent=2) + "\n")
    base = f"/media/editions/{name}"
    records[name] = dict(id=name, brand=brand, style=style, title=f"{title} · {seconds // 60} min", seconds=seconds,
                         description=("Warm editorial motion exploring Quesar's architecture and product direction." if brand == "Quesar" else "A React-rendered perspective on the MLAI ecosystem and its implementation boundaries."),
                         video=f"{RELEASE}/{filename}", poster=f"{base}/poster.jpg", captions=f"{base}/captions.vtt", transcript=f"{base}/transcript.txt",
                         proof=f"public{base}/verification.json", master=filename, sha256=sha)
ordered = [records[name] for name, *_ in candidates if name in records]
DEST.write_text(json.dumps(ordered, indent=2) + "\n")
print(f"Gallery: {len(ordered)} verified masters staged; unfinished masters excluded.")
