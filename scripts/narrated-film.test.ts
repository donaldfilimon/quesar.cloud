import { expect, it } from "vitest";
import { placeCue, captions, encodingLimits } from "./narrated-film";
import { filmCollection } from "../src/lib/mlai/categories/film-collection";
it("rejects overruns, invalid samples and out-of-bounds audio rather than truncating", () => {
  expect(() => placeCue(new Float32Array(10), [1, 1, 1], 0, 0.2, 10)).toThrow("overrun");
  expect(() => placeCue(new Float32Array(10), [NaN], 0, 1, 10)).toThrow("Nonfinite");
  expect(() => placeCue(new Float32Array(10), [1], 1, 2, 10)).toThrow("outside");
});
it("places faded PCM at the exact cue offset and derives exact-text captions", () => {
  const track = new Float32Array(1000);
  expect(placeCue(track, [0, 0.5, 0.5, 0], 1, 2, 100).samples).toBe(4);
  expect(track[101]).toBeCloseTo(0.425);
  expect(track[0]).toBe(0);
  for (const film of filmCollection)
    for (const cue of film.cues) expect(captions(film)).toContain(cue.text);
});
it("budgets the longest film below the delivery limit with audio and muxing headroom", () => {
  for (const film of filmCollection) {
    const limits = encodingLimits(film.duration);
    const maximumBytes = ((limits.videoBitrate + 128000) * film.duration) / 8;
    expect(maximumBytes).toBeLessThan(90 * 1024 * 1024);
    expect(limits.deadlineMs).toBeGreaterThan(Math.ceil(film.duration * 30) * 1000);
  }
  expect(() => encodingLimits(0)).toThrow();
  expect(() => encodingLimits(Number.NaN)).toThrow();
});
