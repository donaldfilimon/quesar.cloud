"""Regression for full-range JPEG capture becoming limited-range H.264 delivery."""
import importlib.util
import json
import math
import shutil
import subprocess
import tempfile
import unittest
import wave
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("film_renderer", ROOT / "render.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class ColorRange(unittest.TestCase):
    def test_real_jpeg_pipeline_produces_limited_range_h264(self):
        ffmpeg = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
        ffprobe = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"
        with tempfile.TemporaryDirectory(prefix="color-range-", dir=ROOT / "receipts") as scratch:
            out = Path(scratch)
            pcm = array("h")
            for i in range(48000):
                sample = int(math.sin(i * 2 * math.pi * 440 / 48000) * 3000)
                pcm.extend((sample, sample))
            with wave.open(str(out / "score.wav"), "wb") as audio:
                audio.setparams((2, 2, 48000, 48000, "NONE", "not compressed"))
                audio.writeframes(pcm.tobytes())
            jpeg = subprocess.run([ffmpeg, "-v", "error", "-threads", "2", "-f", "lavfi", "-i",
                                   "color=c=0xc0a080:s=1920x1080:r=30", "-frames:v", "1",
                                   "-c:v", "mjpeg", "-threads", "2", "-pix_fmt", "yuvj420p",
                                   "-f", "image2pipe", "pipe:1"], capture_output=True, check=True).stdout
            subprocess.run(renderer.encoder_command(ffmpeg, 1, out), input=jpeg * 30,
                           capture_output=True, check=True)
            probe = json.loads(subprocess.run([ffprobe, "-v", "error", "-count_frames", "-show_streams",
                                               "-show_format", "-of", "json", str(out / "ecosystem-1s-1080p.mp4")],
                                              capture_output=True, text=True, check=True).stdout)
            renderer.check_probe(probe, 1)
            visual = next(s for s in probe["streams"] if s["codec_type"] == "video")
            self.assertEqual(visual["color_range"], "tv")
            renderer.write_json(ROOT / "receipts/color-range-smoke.json", {
                "status": "Passed real 30-frame JPEG-to-H.264 encoding",
                "source_renderer_sha256": renderer.digest(ROOT / "render.py"),
                "codec": visual["codec_name"], "pixel_format": visual["pix_fmt"],
                "color_range": visual["color_range"], "frames": int(visual["nb_read_frames"]),
                "dimensions": [visual["width"], visual["height"]],
                "duration_seconds": float(probe["format"]["duration"]),
                "exit_code": 0,
            })


if __name__ == "__main__":
    unittest.main()
