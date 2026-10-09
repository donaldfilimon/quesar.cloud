"""Reproducible edits of the existing React-rendered MLAI/Quesar films.

No stretching, repeated footage, overwritten sources, or network requests.
Each cut retains complete narration cues and emits retimed subtitle sidecars.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'public/media/films'
DELIVERY = Path(__file__).resolve().parent

TRAILER_60 = [('trailer', .8, 43), ('trailer', 43.6, 55), ('trailer', 55.6, 62)]
FILM_60 = [('film', 0, 51), ('film', 60, 69)]
EXPLAINER_120 = [('explainer', 1.2, 9.6), ('explainer', 11, 76), ('explainer', 85, 131.6)]
PLANS = {
    'kinetic-60': TRAILER_60,
    'editorial-60': FILM_60,
    'technical-120': EXPLAINER_120,
    'design-120': [('design', 0, 80), ('abbey', 0, 31), ('film', 60, 69)],
    'technical-180': FILM_60 + EXPLAINER_120,
    'design-180': [('design', 0, 80), ('film', 0, 69), ('abbey', 0, 31)],
    'technical-600': [('film', 1, 69), ('explainer', 0, 132), ('mega', 0, 282), ('abbey', 0, 38), ('design', 0, 80)],
    'design-600': [('design', 0, 80), ('abbey', 0, 38), ('film', 1, 69), ('mega', 0, 282), ('explainer', 0, 132)],
}

def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'{args[0]} exited {result.returncode}: {result.stderr[-4000:]}')
    return result.stdout

def stamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}'

def probe(file):
    return json.loads(run(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(file)]))

def timeline(name):
    offset, cues, chapters = 0, [], []
    for film, start, end in PLANS[name]:
        assert start >= 0 and end > start
        for cue in json.loads((SOURCE / f'{film}.timing.json').read_text())['measurements']:
            a, b = cue['start'], cue['end']
            overlaps = a < end - 1e-6 and b > start + 1e-6
            if overlaps:
                if a < start - 1e-6 or b > end + 1e-6:
                    raise ValueError(f'{name}: edit truncates {cue["id"]}')
                cues.append({**cue, 'start': offset + a - start, 'end': offset + b - start, 'sourceFilm': film})
        chapters.append({'sourceFilm': film, 'sourceStart': start, 'sourceEnd': end, 'start': offset, 'end': offset + end - start})
        offset += end - start
    expected = int(name.rsplit('-', 1)[1])
    if abs(offset - expected) > 1e-6:
        raise ValueError(f'{name}: duration {offset} != {expected}')
    return expected, cues, chapters

def render(name):
    duration, cues, chapters = timeline(name)
    target = DELIVERY / 'artifacts' / name
    target.mkdir(parents=True, exist_ok=False)
    files = list(dict.fromkeys(film for film, _, _ in PLANS[name]))
    args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', '-filter_complex_threads', '2']
    for film in files:
        args += ['-threads', '2', '-i', str(SOURCE / f'{film}.mp4')]
    filters, inputs = [], []
    for i, (film, start, end) in enumerate(PLANS[name]):
        index = files.index(film)
        filters += [f'[{index}:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}]',
                    f'[{index}:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{i}]']
        inputs.append(f'[v{i}][a{i}]')
    filters.append(''.join(inputs) + f'concat=n={len(inputs)}:v=1:a=1[v][a]')
    video = target / f'mlai-quesar-{name}.mp4'
    args += ['-filter_complex', ';'.join(filters), '-map', '[v]', '-map', '[a]',
             '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '18',
             '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k',
             '-ar', '48000', '-movflags', '+faststart', '-t', str(duration), str(video)]
    (target / 'edit.json').write_text(json.dumps({'name': name, 'duration': duration, 'chapters': chapters, 'cues': cues, 'command': args}, indent=2))
    print(f'Rendering {name}', flush=True)
    run(args)
    data = probe(video)
    v = next(s for s in data['streams'] if s['codec_type'] == 'video')
    a = next(s for s in data['streams'] if s['codec_type'] == 'audio')
    assert (v['width'], v['height'], v['avg_frame_rate'], int(v['nb_read_frames'])) == (1920, 1080, '30/1', duration * 30)
    assert v['codec_name'] == 'h264' and a['codec_name'] == 'aac'
    assert abs(float(data['format']['duration']) - duration) <= .05
    assert abs(float(a['duration']) - duration) <= .05
    run(['ffmpeg', '-v', 'error', '-xerror', '-threads', '2', '-i', str(video), '-f', 'null', '-'])
    (target / 'captions.vtt').write_text('WEBVTT\n\n' + '\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}' for i, c in enumerate(cues)) + '\n')
    (target / 'captions.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"]).replace(".", ",")} --> {stamp(c["end"]).replace(".", ",")}\n{c["text"]}' for i, c in enumerate(cues)) + '\n')
    (target / 'transcript.txt').write_text('\n'.join(c['text'] for c in cues) + '\n')
    for label, second in [('opening', min(3, duration / 4)), ('middle', duration / 2), ('closing', duration - 2)]:
        run(['ffmpeg', '-v', 'error', '-n', '-ss', str(second), '-i', str(video), '-frames:v', '1', str(target / f'{label}.jpg')])
    receipt = {'status': 'encoded_and_full_decode_verified', 'listeningAccepted': False,
               'visualReviewAccepted': False, 'probe': data,
               'sha256': hashlib.sha256(video.read_bytes()).hexdigest(),
               'sources': {f: hashlib.sha256((SOURCE / f'{f}.mp4').read_bytes()).hexdigest() for f in files}}
    (target / 'verification.json').write_text(json.dumps(receipt, indent=2))
    print(f'Verified {name}: {duration * 30} frames, {len(cues)} complete cues', flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cut', choices=PLANS)
    parser.add_argument('--preflight', action='store_true')
    options = parser.parse_args()
    if options.preflight:
        for name in PLANS:
            duration, cues, chapters = timeline(name)
            print(f'{name}: {duration}s, {len(cues)} intact cues, {len(chapters)} shots')
    else:
        for name in ([options.cut] if options.cut else PLANS):
            render(name)
