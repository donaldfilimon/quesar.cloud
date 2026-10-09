#!/usr/bin/env python3
"""Stage verified gallery sidecars. Upgrade: --input-dir DIR --release-tag TAG.
The no-argument legacy mode retains the existing partial-sync behavior.
"""
import argparse
import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "src/lib/trailer-editions.generated.json"
RELEASE_BASE = "https://github.com/donaldfilimon/quesar.cloud/releases/download"
LEGACY = "trailer-editions-2026-10-09"


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def candidates(upgrade, input_dir):
    result = []
    for style, seconds in [("kinetic", 60), ("editorial", 60), ("technical", 120), ("design", 120), ("technical", 180), ("design", 180), ("technical", 600), ("design", 600)]:
        name = f"{style}-{seconds}"
        title = {"kinetic": "Kinetic introduction", "editorial": "Editorial introduction", "technical": "MLAI architecture", "design": "MLAI design"}[style]
        folder = input_dir / f"mlai-quesar-{name}" if upgrade else ROOT / "notes/launch/trailer-editions-2026-10-09/artifacts" / name
        filename = f"mlai-quesar-{name}.mp4"
        result.append((name, "MLAI", style, seconds, title, folder, filename, "encoded_and_full_decode_verified"))
    for seconds in (60, 120, 180, 600):
        for style in ("architecture", "studio"):
            name = f"quesar-{style}-{seconds}"
            folder = input_dir / name if upgrade else ROOT / "notes/launch/quesar-editorial-2026-10-09/artifacts-native30" / name
            result.append((name, "Quesar", style, seconds, f"Quesar {style}", folder, f"{name}.mp4", "full_decode_verified"))
    return result


def verified(candidate, tag, upgrade):
    name, brand, style, seconds, title, folder, filename, status = candidate
    receipt = json.loads((folder / "verification.json").read_text())
    video = folder / filename
    require(video.is_file(), f"{name}: missing master")
    require(receipt.get("status") == status, f"{name}: invalid status")
    streams = receipt.get("probe", {}).get("streams", [])
    visual = next((s for s in streams if s.get("codec_type") == "video"), {})
    require(visual.get("width") == 1920 and visual.get("height") == 1080, f"{name}: invalid dimensions")
    require(visual.get("avg_frame_rate") == "30/1" and int(visual.get("nb_read_frames", 0)) == seconds * 30, f"{name}: invalid frame count")
    require(abs(float(visual.get("duration", 0)) - seconds) < .05, f"{name}: invalid duration")
    require(any(s.get("codec_type") == "audio" for s in streams), f"{name}: missing audio")
    if brand == "Quesar":
        require(receipt.get("renderSamplingFps") == 30 and receipt.get("outputFps") == 30 and receipt.get("browserErrors") == [], f"{name}: invalid browser render")
    sha = receipt.get("sha256")
    require(isinstance(sha, str) and re.fullmatch("[0-9a-f]{64}", sha), f"{name}: missing or malformed master checksum")
    require(digest(video) == sha, f"{name}: master checksum does not match receipt")
    poster = folder / (f"sample-{seconds * 15}.jpg" if brand == "Quesar" else "middle.jpg")
    captions, transcript = folder / "captions.vtt", folder / "transcript.txt"
    require(all(p.is_file() for p in (poster, captions, transcript)), f"{name}: missing gallery asset")
    require(captions.read_text().startswith("WEBVTT") and transcript.stat().st_size > 0, f"{name}: invalid text asset")
    if upgrade:
        require(receipt.get("id") == filename.removesuffix(".mp4"), f"{name}: receipt id mismatch")
        require(receipt.get("version") == folder.parent.name, f"{name}: receipt version mismatch")
        hashes = receipt.get("fileHashes")
        required_sidecars = {"captions.vtt", "transcript.txt", "timeline.json" if brand == "Quesar" else "edit.json"}
        require(isinstance(hashes, dict) and required_sidecars <= hashes.keys(), f"{name}: missing sidecar hashes")
        for sidecar, expected in hashes.items():
            require(sidecar in required_sidecars and re.fullmatch("[0-9a-f]{64}", str(expected)), f"{name}: invalid sidecar hash entry")
            require(digest(folder / sidecar) == expected, f"{name}: changed sidecar {sidecar}")
        sources = receipt.get("sources")
        require(isinstance(sources, dict) and sources, f"{name}: missing source manifest")
        external = receipt.get("externalImports")
        require(isinstance(external, list) and all(isinstance(item, str) for item in external), f"{name}: missing external import manifest")
        for relative, expected in sources.items():
            source = (ROOT / relative).resolve()
            require(source.is_relative_to(ROOT) and source.is_file() and re.fullmatch("[0-9a-f]{64}", str(expected)), f"{name}: invalid source {relative}")
            require(digest(source) == expected, f"{name}: changed source {relative}")
        inherited = receipt.get("inheritedInput")
        if brand == "MLAI":
            require(isinstance(inherited, dict) and inherited, f"{name}: missing inherited source manifest")
            for relative, expected in inherited.items():
                source = (ROOT / relative).resolve()
                require(source.is_relative_to(ROOT) and source.is_file() and re.fullmatch("[0-9a-f]{64}", str(expected)), f"{name}: invalid inherited source {relative}")
                require(digest(source) == expected, f"{name}: changed inherited source {relative}")
        else:
            require(inherited is None, f"{name}: unexpected inherited inputs")
        manifest = {"sources": dict(sorted(sources.items())), "externalImports": sorted(external)}
        source_digest = hashlib.sha256(json.dumps(manifest, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
        expected_input = {"sourceDigest": source_digest, "id": filename.removesuffix(".mp4"), "version": receipt.get("version"), "inheritedInput": inherited}
        input_digest = hashlib.sha256(json.dumps(expected_input, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
        require(receipt.get("inputDigest") == input_digest, f"{name}: input digest mismatch")
    base = f"/media/editions/{name}"
    description = ("New Abbey browser Kokoro narration and a revised editorial scene grammar for Quesar." if upgrade and brand == "Quesar" else
                   "The complete original browser neural performance, retained with restrained mastering." if upgrade else
                   "Warm editorial motion exploring Quesar's architecture and product direction." if brand == "Quesar" else
                   "A React-rendered perspective on the MLAI ecosystem and its implementation boundaries.")
    record = dict(id=name, brand=brand, style=style, title=f"{title} · {seconds // 60} min", seconds=seconds,
                  description=description, video=f"{RELEASE_BASE}/{tag}/{filename}", poster=f"{base}/poster.jpg",
                  captions=f"{base}/captions.vtt", transcript=f"{base}/transcript.txt",
                  proof=f"public{base}/verification.json", master=filename, sha256=sha)
    summary = dict(status=receipt["status"], sha256=sha, probe={"streams": [dict(codec_type="video", width=1920, height=1080, avg_frame_rate="30/1", nb_read_frames=seconds * 30, duration=seconds)]})
    if brand == "Quesar":
        summary.update(renderSamplingFps=30, outputFps=30, browserErrors=[])
    if upgrade:
        summary.update(inputDigest=receipt["inputDigest"], sourceDigest=source_digest,
                       listeningReview=receipt.get("listeningReview", "unknown"), visualReview=receipt.get("visualReview", "unknown"),
                       listeningAccepted=receipt.get("listeningAccepted") is True, visualReviewAccepted=receipt.get("visualReviewAccepted") is True,
                       sidecarHashes={key: digest(path) for key, path in (("poster.jpg", poster), ("captions.vtt", captions), ("transcript.txt", transcript))})
    return record, summary, [(poster, "poster.jpg"), (captions, "captions.vtt"), (transcript, "transcript.txt")]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path)
    parser.add_argument("--release-tag")
    args = parser.parse_args()
    require(bool(args.input_dir) == bool(args.release_tag), "Provide both --input-dir and --release-tag for an upgrade")
    upgrade = bool(args.input_dir)
    tag = args.release_tag if upgrade else LEGACY
    require(re.fullmatch("[a-z0-9][a-z0-9-]{0,99}", tag) is not None, "Invalid release tag")
    input_dir = args.input_dir.resolve() if upgrade else ROOT
    require(not upgrade or (input_dir.is_dir() and input_dir.is_relative_to(ROOT)), "Upgrade input must be a repository directory")
    existing = json.loads(DEST.read_text()) if DEST.exists() else []
    records = {record["id"]: record for record in existing}
    prepared = {}
    all_candidates = candidates(upgrade, input_dir)
    for candidate in all_candidates:
        name, _, _, _, _, folder, _, _ = candidate
        if not (folder / "verification.json").is_file():
            require(not upgrade, f"{name}: missing verification receipt; all 16 required")
            continue
        prepared[name] = verified(candidate, tag, upgrade)
        records[name] = prepared[name][0]
    require(not upgrade or len(prepared) == 16, "Upgrade requires all 16 verified masters")
    ordered = [records[c[0]] for c in all_candidates if c[0] in records]
    if upgrade:
        require(len(ordered) == 16 and len({r["id"] for r in ordered}) == 16, "Invalid edition inventory")
        require(all(sum(r["seconds"] == duration for r in ordered) == 4 for duration in (60, 120, 180, 600)), "Invalid duration inventory")
    # No target is touched until every candidate validates. Stage files privately and swap only after successful staging.
    with tempfile.TemporaryDirectory(prefix="trailer-editions-") as scratch:
        staging = Path(scratch)
        for name, (_, summary, assets) in prepared.items():
            target = staging / name
            target.mkdir()
            for source, output in assets:
                shutil.copyfile(source, target / output)
            (target / "verification.json").write_text(json.dumps(summary, indent=2) + "\n")
        for name in prepared:
            target = ROOT / "public/media/editions" / name
            target.mkdir(parents=True, exist_ok=True)
            for source in (staging / name).iterdir():
                shutil.copyfile(source, target / source.name)
        DEST.parent.mkdir(parents=True, exist_ok=True)
        DEST.write_text(json.dumps(ordered, indent=2) + "\n")
    print(f"Gallery: {len(prepared)} verified masters staged; catalog has {len(ordered)} entries.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError) as error:
        raise SystemExit(str(error)) from error
