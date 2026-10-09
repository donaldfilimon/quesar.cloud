#!/usr/bin/env python3
"""Offline deterministic ecosystem film. Python stdlib + installed Playwright/FFmpeg."""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import math
import re
import shutil
import struct
import subprocess
import sys
import wave
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
FPS, RATE = 30, 48000
WIDTH, HEIGHT = 1920, 1080
CUTS = (90, 30, 15)
SOURCE_FILES = ("render.py", "film.html", "timeline.json", "claims.json", "STORYBOARD.md", "README.md", "test_render.py", "test_color_range.py")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(args: list[str], **kwargs) -> subprocess.CompletedProcess:
    result = subprocess.run(args, text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(f"Command exited {result.returncode}: {args!r}\n{result.stderr[-4000:]}")
    return result


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    value = json.dumps(data, indent=2) + "\n"
    prettier = REPO / "node_modules/.bin/prettier"
    if not prettier.is_file():
        raise RuntimeError("Use the repository's already installed Prettier; no install is performed")
    formatted = run([str(prettier), "--ignore-path", "/dev/null", "--stdin-filepath", str(path)], input=value).stdout
    if json.loads(formatted) != data:
        raise RuntimeError("Formatter changed JSON evidence")
    path.write_text(formatted)


def shots(timeline: dict, duration: int) -> list[dict]:
    if duration not in CUTS:
        raise ValueError("Supported cuts are 90, 30 and 15 seconds")
    lengths = timeline["cuts"][str(duration)]
    if len(lengths) != len(timeline["scenes"]) or sum(lengths) != duration or any(x < 0 for x in lengths):
        raise ValueError("Timeline must have nonnegative holds that total the cut duration")
    result, start = [], 0
    for scene, length in zip(timeline["scenes"], lengths):
        if length:
            result.append({"scene": scene, "start": start, "end": start + length})
        start += length
    return result


def captions(timeline: dict, duration: int) -> list[dict]:
    result = []
    for shot in shots(timeline, duration):
        scene = shot["scene"]
        # Shorter cuts are editorial recuts with their own readable language.
        text = scene["caption"] if duration == 90 else scene["short"] if duration == 30 else scene["micro"]
        if duration != 90 and scene["id"] not in ("opening", "closing"):
            text = scene["product"] + ": " + text
        result.append({"text": text, "startMs": shot["start"] * 1000,
                       "endMs": shot["end"] * 1000, "timestampMs": None, "confidence": None})
    return result


def timecode(ms: int, *, srt: bool = False) -> str:
    hours, rem = divmod(ms, 3600000)
    minutes, rem = divmod(rem, 60000)
    seconds, milliseconds = divmod(rem, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02}{',' if srt else '.'}{milliseconds:03}"


def write_captions(timeline: dict, duration: int) -> None:
    base = ROOT / "captions"
    cues = captions(timeline, duration)
    write_json(base / f"ecosystem-{duration}s.json", cues)
    for extension in ("srt", "vtt"):
        srt = extension == "srt"
        body = "" if srt else "WEBVTT\n\n"
        for i, cue in enumerate(cues, 1):
            body += (f"{i}\n" if srt else "") + f"{timecode(cue['startMs'], srt=srt)} --> {timecode(cue['endMs'], srt=srt)}\n{cue['text']}\n\n"
        (base / f"ecosystem-{duration}s.{extension}").write_text(body)
    (base / f"ecosystem-{duration}s.transcript.txt").write_text(
        "Music-only film. Captions summarize the visual copy; there is no speech.\n\n" +
        "\n".join(f"{timecode(cue['startMs'])} {cue['text']}" for cue in cues) + "\n")


def new_output(base: Path, duration: int) -> Path:
    if duration not in CUTS:
        raise ValueError("Invalid duration")
    out = base / "artifacts" / f"{duration}s"
    out.mkdir(parents=True, exist_ok=False)
    return out


def synthesize(path: Path, duration: int, timeline: dict) -> dict:
    """Original 96 BPM additive pads/plucks/pulses, no samples or external models."""
    count = RATE * duration
    left, right = array("d", [0.0]) * count, array("d", [0.0]) * count
    chords = [(50, 57, 60, 64), (46, 53, 57, 60), (48, 55, 59, 62),
              (53, 57, 60, 67), (45, 52, 57, 60), (48, 55, 62, 64),
              (46, 53, 57, 62), (50, 57, 60, 64), (50, 57, 62, 69)]

    def tone(start, length, midi, gain, pan, pluck=False):
        first, end = max(0, int(start * RATE)), min(count, int((start + length) * RATE))
        f = 440 * 2 ** ((midi - 69) / 12)
        l, r = math.sqrt((1 - pan) / 2), math.sqrt((1 + pan) / 2)
        for i in range(first, end):
            t = (i - first) / RATE
            envelope = min(1, t / (.008 if pluck else .55)) * min(1, (length - t) / (.25 if pluck else 1.1))
            envelope *= math.exp(-t * 2.9) if pluck else .82 + .18 * math.sin(t * 1.3)
            phase = 2 * math.pi * f * t
            sample = (math.sin(phase) + .18 * math.sin(phase * 2) + .035 * math.sin(phase * 3)) * envelope * gain
            left[i] += sample * l
            right[i] += sample * r

    schedule = shots(timeline, duration)
    for shot in schedule:
        idx = timeline["scenes"].index(shot["scene"])
        chord = chords[idx]
        span = shot["end"] - shot["start"]
        for j, note in enumerate(chord):
            tone(shot["start"], span + .4, note, .036, (j - 1.5) / 2)
        tone(shot["start"], min(span + .4, 5), chord[0] - 12, .035, 0)
        step = .625 if duration == 90 else .5
        for j in range(int(span / step)):
            at = shot["start"] + j * step
            note = chord[(j + idx) % len(chord)] + 12
            tone(at, .95, note, .026, math.sin(j * 1.2) * .75, True)
            tone(at + .23, .65, note, .008, -math.sin(j * 1.2) * .75, True)
    pcm = array("h")
    peak = 0.0
    for i in range(count):
        t = i / RATE
        fade = min(1, t / .07, (duration - t) / 1.0)
        for value in (left[i], right[i]):
            value *= fade
            peak = max(peak, abs(value))
            if abs(value) >= 1:
                raise RuntimeError("Synthesizer clipped")
            pcm.append(round(value * 32767))
    if sys.byteorder != "little":
        pcm.byteswap()
    with wave.open(str(path), "wb") as output:
        output.setparams((2, 2, RATE, count, "NONE", "not compressed"))
        output.writeframes(pcm.tobytes())
    return {"source": "Original standard-library additive synthesis in render.py; no third-party music, samples, model output or service",
            "bpm": 96 if duration == 90 else 120, "duration_seconds": duration,
            "sample_rate_hz": RATE, "channels": 2, "raw_peak_linear": peak,
            "score_edit": "Newly phrased to each cut's scene schedule; no accelerated master audio"}


def normalize(ffmpeg: str, raw: Path, output: Path) -> dict:
    scan = run([ffmpeg, "-hide_banner", "-nostdin", "-threads", "2", "-i", str(raw),
                "-af", "loudnorm=I=-18:TP=-1.5:LRA=8:print_format=json", "-f", "null", "-"])
    measure = json.loads(re.findall(r"\{[^{}]+\}", scan.stderr)[-1])
    settings = "loudnorm=I=-18:TP=-1.5:LRA=8:linear=true:print_format=json"
    for key, source in (("measured_I", "input_i"), ("measured_TP", "input_tp"),
                        ("measured_LRA", "input_lra"), ("measured_thresh", "input_thresh"), ("offset", "target_offset")):
        settings += f":{key}={measure[source]}"
    run([ffmpeg, "-y", "-v", "error", "-nostdin", "-threads", "2", "-i", str(raw),
         "-af", settings, "-ar", str(RATE), "-ac", "2", "-c:a", "pcm_s16le", str(output)])
    return {"method": "Measured two-pass FFmpeg loudnorm", "target_lufs": -18, "raw_measurement": measure}


def open_page(browser, timeline: dict, duration: int):
    page = browser.new_page(viewport={"width": 1200, "height": 675}, device_scale_factor=1.6)
    errors, requests = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def route(request):
        if request.request.url.startswith("file:"):
            request.continue_()
        else:
            requests.append(request.request.url)
            request.abort()

    page.route("**/*", route)
    page.goto((ROOT / "film.html").as_uri() + "?capture=1", wait_until="load")
    page.evaluate("([data,duration])=>configure(data,duration)", [timeline, duration])
    page.evaluate("()=>document.fonts.ready")
    return page, errors, requests


def preview(timeline: dict) -> None:
    from playwright.sync_api import sync_playwright
    output = ROOT / "receipts/previews"
    output.mkdir(exist_ok=False)
    records = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for duration in CUTS:
            page, errors, requests = open_page(browser, timeline, duration)
            samples = []
            for shot, cue in zip(shots(timeline, duration), captions(timeline, duration)):
                seconds = (shot["start"] + shot["end"]) / 2
                page.evaluate("t=>renderFrame(t)", seconds)
                audit = page.evaluate("()=>audit()")
                if audit["overflow"]:
                    raise RuntimeError(f"Copy overflow: {duration}s {shot['scene']['id']} {audit}")
                if audit["caption"] != cue["text"]:
                    raise RuntimeError("Burned captions differ from the sidecar copy")
                name = f"{duration}s-{shot['scene']['id']}.png"
                page.screenshot(path=str(output / name), animations="disabled")
                samples.append({"time": seconds, "image": name, **audit})
            if errors or requests:
                raise RuntimeError(f"Browser failure: {errors}, external requests: {requests}")
            records[str(duration)] = samples
            page.close()
        browser.close()
    write_json(output / "layout-audit.json", records)
    print(f"Previewed {sum(map(len, records.values()))} shots with no text overflow", flush=True)


def encoder_command(ffmpeg: str, duration: int, output: Path) -> list[str]:
    video = output / f"ecosystem-{duration}s-1080p.mp4"
    return [ffmpeg, "-y", "-hide_banner", "-loglevel", "warning", "-nostdin", "-threads", "2",
               "-f", "image2pipe", "-framerate", str(FPS), "-vcodec", "mjpeg", "-i", "pipe:0",
               "-i", str(output / "score.wav"), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264",
               "-threads", "2", "-preset", "medium", "-crf", "17",
               "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-color_range", "tv",
               "-pix_fmt", "yuv420p", "-r", str(FPS),
               "-frames:v", str(duration * FPS), "-c:a", "aac", "-b:a", "192k", "-ar", str(RATE),
               "-t", str(duration), "-movflags", "+faststart", "-map_metadata", "-1",
               "-metadata", "title=Build with understanding — ecosystem concept film",
               "-metadata", "comment=Abstract concept illustrations; source-grounded orientation, not runtime or deployment proof.", str(video)]


def capture(ffmpeg: str, timeline: dict, duration: int, output: Path) -> dict:
    from playwright.sync_api import sync_playwright
    command = encoder_command(ffmpeg, duration, output)
    sample_frames = {0, duration * FPS - 1} | {int((s["start"] + s["end"]) / 2 * FPS) for s in shots(timeline, duration)}
    hashes, audit_records = {}, []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page, errors, requests = open_page(browser, timeline, duration)
            cdp = page.context.new_cdp_session(page)
            cdp.send("DOM.enable"); cdp.send("CSS.enable")
            document = cdp.send("DOM.getDocument")
            fonts = {}
            for selector in ("h1", "#product", "#body", "#role", "#caption"):
                node = cdp.send("DOM.querySelector", {"nodeId": document["root"]["nodeId"], "selector": selector})
                fonts[selector] = cdp.send("CSS.getPlatformFontsForNode", {"nodeId": node["nodeId"]})["fonts"]
            page.evaluate("()=>renderFrame(1.3)")
            first = page.screenshot(type="jpeg", quality=96, animations="disabled")
            page.evaluate("()=>renderFrame(6.1)")
            page.evaluate("()=>renderFrame(1.3)")
            if page.screenshot(type="jpeg", quality=96, animations="disabled") != first:
                raise RuntimeError("Frame sampling is not deterministic")
            with (output / "encode.log").open("wb") as log:
                process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=log, stdout=subprocess.DEVNULL)
                try:
                    for frame in range(duration * FPS):
                        page.evaluate("t=>renderFrame(t)", frame / FPS)
                        if frame in sample_frames:
                            audit = page.evaluate("()=>audit()")
                            if audit["overflow"]:
                                raise RuntimeError(f"Text overflow at frame {frame}: {audit}")
                            audit_records.append({"frame": frame, **audit})
                        encoded = page.screenshot(type="jpeg", quality=96, animations="disabled")
                        if frame in sample_frames:
                            hashes[str(frame)] = hashlib.sha256(encoded).hexdigest()
                        process.stdin.write(encoded)
                        if frame % 150 == 0:
                            print(f"{duration}s: {frame}/{duration * FPS} frames", flush=True)
                    process.stdin.close()
                    code = process.wait(timeout=180)
                    if code:
                        raise RuntimeError(f"Encoder exited {code}: {(output / 'encode.log').read_text()[-3000:]}")
                except BaseException:
                    if process.poll() is None:
                        process.kill()
                    process.wait()
                    raise
            if errors or requests:
                raise RuntimeError(f"Browser errors={errors}, external requests={requests}")
            return {"browser": browser.version, "fonts": fonts, "capture": "1920x1080 native canvas/DOM at CSS 1200x675 DPR 1.6; JPEG quality 96 intermediate frames",
                    "repeat_frame_identical": True, "page_errors": errors, "external_requests": requests,
                    "layout_audit": audit_records, "sampled_frame_sha256": hashes, "ffmpeg_command": command}
        finally:
            browser.close()


def check_probe(data: dict, duration: int) -> None:
    visual = next(s for s in data["streams"] if s["codec_type"] == "video")
    audio = next(s for s in data["streams"] if s["codec_type"] == "audio")
    expected = (WIDTH, HEIGHT, "h264", "yuv420p", "30/1", duration * FPS)
    actual = (visual["width"], visual["height"], visual["codec_name"], visual["pix_fmt"],
              visual["avg_frame_rate"], int(visual["nb_read_frames"]))
    if actual != expected:
        raise ValueError(f"Video contract mismatch: {actual} != {expected}")
    if visual.get("color_range") != "tv":
        raise ValueError("Expected limited (TV) video range")
    if (audio["codec_name"], int(audio["sample_rate"]), audio["channels"]) != ("aac", RATE, 2):
        raise ValueError("Expected stereo 48kHz AAC")
    if abs(float(data["format"]["duration"]) - duration) > .05 or abs(float(audio["duration"]) - duration) > .05:
        raise ValueError("Video/audio duration mismatch")


def validate(ffmpeg: str, ffprobe: str, timeline: dict, duration: int, output: Path) -> dict:
    video = output / f"ecosystem-{duration}s-1080p.mp4"
    probe = json.loads(run([ffprobe, "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", str(video)]).stdout)
    check_probe(probe, duration)
    with wave.open(str(output / "score.wav")) as handle:
        if (handle.getframerate(), handle.getnchannels(), handle.getnframes()) != (RATE, 2, duration * RATE):
            raise ValueError("WAV sample contract mismatch")
    decode = run([ffmpeg, "-v", "error", "-xerror", "-threads", "2", "-i", str(video), "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-"])
    if decode.stderr.strip():
        raise RuntimeError(decode.stderr)
    atoms = []
    with video.open("rb") as handle:
        while header := handle.read(8):
            size, kind = struct.unpack(">I4s", header)
            header_size = 8
            if size == 1:
                size = struct.unpack(">Q", handle.read(8))[0]; header_size = 16
            atoms.append(kind.decode("ascii"))
            if not size:
                break
            if size < header_size:
                raise ValueError("Malformed MP4 atom")
            handle.seek(size - header_size, 1)
    if atoms.index("moov") > atoms.index("mdat"):
        raise ValueError("Expected faststart atom order")
    measure = run([ffmpeg, "-hide_banner", "-nostdin", "-threads", "2", "-i", str(video), "-vn",
                   "-af", "loudnorm=I=-18:TP=-1.5:LRA=8:print_format=json", "-f", "null", "-"])
    loudness = json.loads(re.findall(r"\{[^{}]+\}", measure.stderr)[-1])
    if not -19 < float(loudness["input_i"]) < -17 or float(loudness["input_tp"]) > -1:
        raise ValueError(f"Audio bounds: {loudness}")
    stills = [(s["scene"]["id"], (s["start"] + s["end"]) / 2) for s in shots(timeline, duration)]
    stills += [("first", 0), ("middle", duration / 2), ("last", duration - 1 / FPS)]
    for name, seconds in stills:
        run([ffmpeg, "-y", "-v", "error", "-threads", "2", "-ss", str(seconds), "-i", str(video),
             "-frames:v", "1", "-threads", "2", str(output / f"{name}.png")])
    shutil.copyfile(output / "opening.png", output / "poster.png")
    indices = [round((s["start"] + s["end"]) / 2 * FPS) for s in shots(timeline, duration)]
    expression = "+".join(f"eq(n,{n})" for n in indices)
    run([ffmpeg, "-y", "-v", "error", "-threads", "2", "-i", str(video), "-vf",
         f"select='{expression}',scale=640:360,tile=3x3", "-frames:v", "1", "-threads", "2", "-q:v", "2", str(output / "contact-sheet.jpg")])
    return {"ffprobe": probe, "full_decode_exit_code": decode.returncode, "full_decode_stderr": decode.stderr,
            "mp4_atoms": atoms, "faststart": True, "encoded_audio_loudness": loudness,
            "decoded_stills": [{"name": name + ".png", "seconds": seconds} for name, seconds in stills],
            "visual_review": "Pending image-tool inspection"}


def manifest(output: Path) -> None:
    files = {p.name: {"bytes": p.stat().st_size, "sha256": digest(p)} for p in sorted(output.iterdir())
             if p.is_file() and p.name not in ("manifest.json", "SHA256SUMS")}
    write_json(output / "manifest.json", {"scope": "Standalone concept film artifacts", "files": files})
    (output / "SHA256SUMS").write_text("".join(f"{entry['sha256']}  {name}\n" for name, entry in files.items()))


def verify_originals() -> int:
    before = json.loads((ROOT / "receipts/preserved-originals.json").read_text())
    for name, expected in before.items():
        if digest(REPO / name) != expected:
            raise RuntimeError(f"Pre-existing file changed: {name}")
    return len(before)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cut", type=int, choices=CUTS)
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--captions-only", action="store_true")
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--ffprobe", default=shutil.which("ffprobe"))
    args = parser.parse_args()
    timeline = json.loads((ROOT / "timeline.json").read_text())
    for duration in CUTS:
        shots(timeline, duration)
        write_captions(timeline, duration)
    if args.captions_only:
        print("Caption JSON, SRT, WebVTT and transcripts generated for all three cuts")
        return
    if args.preview:
        preview(timeline)
        return
    if not args.cut or not args.ffmpeg or not args.ffprobe:
        parser.error("Provide --cut and installed FFmpeg/FFprobe, or use --preview")
    before = {name: digest(ROOT / name) for name in SOURCE_FILES}
    output = new_output(ROOT, args.cut)
    print(f"Synthesizing {args.cut}s original score", flush=True)
    raw = output / "score-raw.wav"
    score = synthesize(raw, args.cut, timeline)
    score["normalization"] = normalize(args.ffmpeg, raw, output / "score.wav")
    raw.unlink()
    proof = capture(args.ffmpeg, timeline, args.cut, output)
    # Retain actual capture provenance even if a later strict media check fails.
    write_json(output / "capture-record.json", {"status": "Captured; validation pending",
               "source_sha256": before, "capture": proof, "score": score})
    validation = validate(args.ffmpeg, args.ffprobe, timeline, args.cut, output)
    after = {name: digest(ROOT / name) for name in SOURCE_FILES}
    if before != after:
        raise RuntimeError("Editable source changed during capture")
    retained = verify_originals()
    report = {"status": "Technically verified; decoded visual review pending", "duration_seconds": args.cut,
              "dimensions": [WIDTH, HEIGHT], "fps": FPS, "frames": args.cut * FPS,
              "source_sha256": before, "python": sys.version, "playwright": importlib.metadata.version("playwright"),
              "ffmpeg": run([args.ffmpeg, "-version"]).stdout.splitlines()[0],
              "capture": proof, "score": score, "validation": validation, "preserved_original_file_count": retained,
              "provenance": {"visuals": "Original deterministic vector/Canvas choreography and text wordmarks; abstract concept illustrations, no simulated UI or performance evidence",
                             "fonts": "Installed system fonts, reported per DOM selector; no font binaries distributed",
                             "music": score["source"], "external_assets": [], "narration": "None. Captions describe visual content."}}
    write_json(output / "render-report.json", report)
    manifest(output)
    print(f"Finished and verified: {output}", flush=True)


if __name__ == "__main__":
    main()
