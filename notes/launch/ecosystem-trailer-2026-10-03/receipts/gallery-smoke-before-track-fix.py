"""Exercise the actual root-owned local review gallery without modifying it."""
import importlib.util
import time
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GALLERY = Path('/Users/donaldfilimon/dev/active/wdbx/docs/verification/2026-10-03-ecosystem-film-review.html')
spec = importlib.util.spec_from_file_location('film_renderer', ROOT / 'render.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)
before = renderer.digest(GALLERY)
results, console_errors, page_errors, remote = [], [], [], []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        version = browser.version
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

        def route(request):
            if request.request.url.startswith('file:'):
                request.continue_()
            else:
                remote.append(request.request.url)
                request.abort()

        page.route('**/*', route)
        page.goto(GALLERY.as_uri(), wait_until='load')
        initial = page.eval_on_selector_all('video', 'vs=>vs.map(v=>({autoplay:v.autoplay,paused:v.paused,currentTime:v.currentTime,preload:v.preload,src:v.currentSrc||v.src,poster:v.poster}))')
        if len(initial) != 3 or any(v['autoplay'] or not v['paused'] or v['currentTime'] != 0 for v in initial):
            raise RuntimeError(f'Unexpected initial autoplay: {initial}')
        links = page.eval_on_selector_all('a', 'as=>as.map(a=>({text:a.textContent,href:a.href}))')
        for link in links:
            parsed = urlparse(link['href'])
            link['exists'] = parsed.scheme == 'file' and Path(unquote(parsed.path)).is_file()
        for video in initial:
            for key in ('src', 'poster'):
                if not Path(unquote(urlparse(video[key]).path)).is_file():
                    raise RuntimeError(f'Missing {key}: {video[key]}')
        layouts = []
        for width, height in ((1440, 1000), (390, 844)):
            page.set_viewport_size({'width': width, 'height': height})
            layout = page.evaluate('({width:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth})')
            if layout['scrollWidth'] > layout['clientWidth']:
                raise RuntimeError(f'Horizontal overflow: {layout}')
            layouts.append(layout)
        page.set_viewport_size({'width': 1440, 'height': 1000})
        for index, duration in enumerate((90, 30, 15)):
            page.evaluate('''i=>{const v=document.querySelectorAll('video')[i];window.mediaErrors=[];v.addEventListener('error',()=>window.mediaErrors.push({code:v.error.code,message:v.error.message}));v.preload='auto';v.load();for(const t of v.textTracks)t.mode='hidden'}''', index)
            page.wait_for_function("i=>window.mediaErrors.length||document.querySelectorAll('video')[i].readyState>=2", arg=index, timeout=15000)
            metadata = page.evaluate("i=>{const v=document.querySelectorAll('video')[i];return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,paused:v.paused,currentTime:v.currentTime,src:v.currentSrc,errors:window.mediaErrors}}", index)
            if metadata['errors'] or not metadata['paused'] or (metadata['width'], metadata['height']) != (1920, 1080) or abs(metadata['duration'] - duration) > .05:
                raise RuntimeError(f'Metadata error: {metadata}')
            started = time.monotonic()
            play = page.evaluate("async i=>{const v=document.querySelectorAll('video')[i];v.muted=true;v.playbackRate=8;await v.play();return {muted:v.muted,rate:v.playbackRate,paused:v.paused}}", index)
            if play != {'muted': True, 'rate': 8, 'paused': False}:
                raise RuntimeError(f'Play failed: {play}')
            page.wait_for_function("i=>document.querySelectorAll('video')[i].currentTime>0.5", arg=index, timeout=10000)
            advanced = page.evaluate("i=>document.querySelectorAll('video')[i].currentTime", index)
            page.wait_for_function("i=>window.mediaErrors.length||document.querySelectorAll('video')[i].ended", arg=index, timeout=int(duration / 8 * 1000 + 20000))
            final = page.evaluate("i=>{const v=document.querySelectorAll('video')[i];return {ended:v.ended,currentTime:v.currentTime,errors:window.mediaErrors,tracks:[...v.querySelectorAll('track')].map(t=>({src:t.src,readyState:t.readyState,cues:t.track.cues?.length??null}))}}", index)
            if not final['ended'] or final['errors'] or abs(final['currentTime'] - duration) > .05:
                raise RuntimeError(f'Playback failed: {final}')
            results.append({'duration_seconds': duration, 'metadata': metadata, 'play': play,
                            'first_observed_advanced_time': advanced, 'final': final,
                            'wall_seconds': round(time.monotonic() - started, 3)})
            print(f'Gallery {duration}s: explicit 8x muted playback ended; tracks={final["tracks"]}', flush=True)
        if page_errors or remote:
            raise RuntimeError(f'Unexpected page or external requests: {page_errors}, {remote}')
    finally:
        browser.close()
after = renderer.digest(GALLERY)
if before != after:
    raise RuntimeError('Gallery changed during playback audit')
renderer.write_json(ROOT / 'receipts/gallery-playback.json', {
    'status': 'Media playback and layout passed; inspect optional track states separately',
    'gallery': str(GALLERY), 'gallery_sha256': before, 'browser': f'Cached Chromium {version}',
    'initial': initial, 'layouts': layouts, 'links': links, 'videos': results,
    'console_errors': console_errors, 'page_errors': page_errors, 'external_requests': remote,
    'script_sha256': renderer.digest(Path(__file__)), 'owned_browser_closed': True,
    'limits': 'Automated muted 8x playback; not human listening or full-pace creative review; no browser security flags changed',
})
