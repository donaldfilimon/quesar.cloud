"""Portable contract checks; no browser or FFmpeg required."""
import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("film_renderer", ROOT / "render.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class Contracts(unittest.TestCase):
    def setUp(self):
        self.timeline = json.loads((ROOT / "timeline.json").read_text())

    def test_all_cuts_have_exact_duration_and_six_product_holds(self):
        for duration in (90, 30, 15):
            shots = renderer.shots(self.timeline, duration)
            self.assertEqual(shots[-1]["end"], duration)
            self.assertEqual({s["scene"]["id"] for s in shots[1:-1]},
                             {"wdbx", "abi", "abbey", "abbey-bot", "quesar", "webpress"}
                             | ({"together"} if duration == 90 else set()))
            self.assertTrue(all(s["end"] - s["start"] >= (1 if duration == 15 else 2) for s in shots))

    def test_bad_duration_is_refused(self):
        self.timeline["cuts"]["90"][0] += 1
        with self.assertRaises(ValueError):
            renderer.shots(self.timeline, 90)
        with self.assertRaises(ValueError):
            renderer.shots(self.timeline, 22)

    def test_caption_timing_matches_each_cut_and_remains_readable(self):
        for duration in (90, 30, 15):
            cues = renderer.captions(self.timeline, duration)
            self.assertEqual(cues[0]["startMs"], 0)
            self.assertEqual(cues[-1]["endMs"], duration * 1000)
            for i, cue in enumerate(cues):
                self.assertLess(cue["startMs"], cue["endMs"])
                self.assertLessEqual(len(cue["text"]) / ((cue["endMs"] - cue["startMs"]) / 1000), 25)
                if i:
                    self.assertEqual(cues[i - 1]["endMs"], cue["startMs"])

    def test_output_refuses_existing_directory_and_outside_task(self):
        with tempfile.TemporaryDirectory() as scratch:
            base = Path(scratch) / "task"
            base.mkdir()
            path = renderer.new_output(base, 90)
            self.assertTrue(path.is_dir())
            with self.assertRaises(FileExistsError):
                renderer.new_output(base, 90)
        with self.assertRaises(ValueError):
            renderer.new_output(ROOT, "../outside")

    def test_encoded_media_contract_rejects_wrong_geometry_frames_and_audio(self):
        data = {"streams": [
            {"codec_type": "video", "codec_name": "h264", "width": 1920, "height": 1080,
             "pix_fmt": "yuv420p", "color_range": "tv", "avg_frame_rate": "30/1", "nb_read_frames": "2700"},
            {"codec_type": "audio", "codec_name": "aac", "channels": 2,
             "sample_rate": "48000", "duration": "90.0"}], "format": {"duration": "90.0"}}
        renderer.check_probe(data, 90)
        for stream, key, value in ((0, "height", 1920), (0, "nb_read_frames", "2699"),
                                   (0, "color_range", "pc"), (1, "channels", 1), (1, "duration", "88.0")):
            bad = copy.deepcopy(data)
            bad["streams"][stream][key] = value
            with self.assertRaises(ValueError):
                renderer.check_probe(bad, 90)

    def test_all_source_evidence_has_content_hash_and_exact_location(self):
        claims = json.loads((ROOT / "claims.json").read_text())
        self.assertEqual(len(claims["products"]), 6)
        for product in claims["products"]:
            self.assertTrue(product["sources"])
            for source in product["sources"]:
                self.assertEqual(len(source["sha256"]), 64)
                self.assertGreater(source["line_start"], 0)
                self.assertGreaterEqual(source["line_end"], source["line_start"])


if __name__ == "__main__":
    unittest.main()
