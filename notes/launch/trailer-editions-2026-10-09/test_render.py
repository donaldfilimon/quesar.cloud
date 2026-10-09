import unittest
from unittest.mock import patch
import render


class EditorialContract(unittest.TestCase):
    def test_all_requested_durations_have_two_editions(self):
        durations = [render.timeline(name)[0] for name in render.PLANS]
        self.assertEqual(sorted(durations), [60, 60, 120, 120, 180, 180, 600, 600])

    def test_cues_fit_the_output_and_preserve_spoken_text(self):
        for name in render.PLANS:
            duration, cues, _ = render.timeline(name)
            for cue in cues:
                self.assertGreaterEqual(cue['start'], 0)
                self.assertLessEqual(cue['end'], duration)
                self.assertLessEqual(cue['seconds'], cue['end'] - cue['start'] + 1e-6)

    def test_rejects_cut_through_narration(self):
        with patch.dict(render.PLANS, {'bad-60': [('trailer', 1, 61)]}):
            with self.assertRaisesRegex(ValueError, 'truncates'):
                render.timeline('bad-60')

    def test_rejects_wrong_duration(self):
        with patch.dict(render.PLANS, {'bad-60': [('trailer', 0, 62)]}):
            with self.assertRaisesRegex(ValueError, 'duration'):
                render.timeline('bad-60')

    def test_long_editions_do_not_repeat_footage(self):
        for name in ['technical-600', 'design-600']:
            films = [segment[0] for segment in render.PLANS[name]]
            self.assertEqual(len(films), len(set(films)))


if __name__ == '__main__':
    unittest.main()
