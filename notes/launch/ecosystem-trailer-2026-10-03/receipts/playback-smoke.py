"""Cached Chromium native-video playback acceptance; no server or remote network."""
import importlib.util
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("film_renderer", ROOT / "render.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)
PLAYER = ROOT / "receipts/playback-smoke.html"
PLAYER.write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Local MP4 playback smoke</title><style>body{margin:0;background:#080e16}video{display:block;width:100vw;height:100vh}</style><video controls muted playsinline preload="auto"></video></html>\n')
results = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        version = browser.version
        for duration in (90, 30, 15):
            page = browser.new_page(viewport={"width": 960, "height": 540})
            errors, remote = [], []
            page.on("pageerror", lambda error: errors.append(str(error)))

            def route(request):
                if request.request.url.startswith("file:"):
                    request.continue_()
                else:
                    remote.append(request.request.url)
                    request.abort()

            page.route("**/*", route)
            page.goto(PLAYER.as_uri(), wait_until="load")
            video = ROOT / f"artifacts/{duration}s/ecosystem-{duration}s-1080p.mp4"
            page.evaluate("""url => {
                const v = document.querySelector('video');
                window.mediaErrors = []; window.events = [];
                v.addEventListener('error', () => window.mediaErrors.push({code:v.error.code,message:v.error.message}));
                for (const name of ['loadedmetadata','playing','timeupdate','ended']) v.addEventListener(name,()=>window.events.push({name,time:v.currentTime}));
                v.src = url; v.load();
            }""", video.as_uri())
            page.wait_for_function("window.mediaErrors.length || document.querySelector('video').readyState >= 2", timeout=15000)
            metadata = page.evaluate("""() => {const v=document.querySelector('video');return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,currentTime:v.currentTime,errors:window.mediaErrors}}""")
            if metadata["errors"] or (metadata["width"], metadata["height"]) != (1920, 1080) or abs(metadata["duration"] - duration) > .05:
                raise RuntimeError(f"Video metadata failure: {metadata}")
            started = time.monotonic()
            playing = page.evaluate("""async () => {const v=document.querySelector('video');v.muted=true;v.playbackRate=8;await v.play();return {paused:v.paused,rate:v.playbackRate,muted:v.muted}}""")
            if playing != {"paused": False, "rate": 8, "muted": True}:
                raise RuntimeError(f"Playback did not start: {playing}")
            page.wait_for_function("document.querySelector('video').currentTime > 0.5", timeout=10000)
            advanced = page.evaluate("document.querySelector('video').currentTime")
            page.wait_for_function("window.mediaErrors.length || document.querySelector('video').ended", timeout=int(duration / 8 * 1000 + 20000))
            final = page.evaluate("""() => {const v=document.querySelector('video');const q=v.getVideoPlaybackQuality();return {ended:v.ended,currentTime:v.currentTime,errors:window.mediaErrors,events:window.events,totalVideoFrames:q.totalVideoFrames,droppedVideoFrames:q.droppedVideoFrames}}""")
            if not final["ended"] or final["errors"] or abs(final["currentTime"] - duration) > .05 or errors or remote:
                raise RuntimeError(f"Playback failure: {final}, {errors}, {remote}")
            results.append({"file": str(video.relative_to(ROOT)), "sha256": renderer.digest(video),
                            "metadata": metadata, "playback": playing, "first_observed_advanced_time": advanced,
                            "final": final, "wall_seconds": round(time.monotonic() - started, 3),
                            "page_errors": errors, "external_requests": remote})
            print(f"{duration}s: native video advanced and ended at 8x without errors", flush=True)
            page.close()
    finally:
        browser.close()
renderer.write_json(ROOT / "receipts/browser-playback.json", {
    "status": "Passed all three MP4s", "browser": f"Cached Chromium {version}", "playback_rate": 8,
    "muted": True, "network": "Local file URLs only; no server", "videos": results,
    "limits": "Automated accelerated playback; not human listening, full-pace creative review or every-frame visual inspection",
    "script_sha256": renderer.digest(Path(__file__)), "owned_browser_closed": True,
})
