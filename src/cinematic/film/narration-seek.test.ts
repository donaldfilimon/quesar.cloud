import { describe, expect, it } from "vitest";
import { MAX_FRAME_DT } from "@/lib/trailer-engine";
import { resolveNarrationSeek } from "./narration-seek";

const cues = [
  { at: 0.9, text: "Opening" },
  { at: 4, text: "First idea" },
  { at: 7.4, text: "Second idea" },
  { at: 20, text: "Seek destination" },
  { at: 20.025, text: "Next real crossing" },
  { at: 25, text: "Later idea" },
];
const start = (cue: (typeof cues)[number]) => cue.at;

describe("narration seeks", () => {
  it("marks historical cues past after a forward seek without disarming the next cue", () => {
    const spoken = resolveNarrationSeek(1, 20, cues, start);
    expect(spoken).toEqual(new Set([0.9, 4, 7.4, 20]));
    expect(spoken?.has(20.025)).toBe(false);
    // Playback can cross the immediately following cue on its next legal frame.
    expect(resolveNarrationSeek(20, 20.05, cues, start)).toBeNull();
  });

  it("re-arms future cues after a backward seek instead of retaining the old history", () => {
    expect(resolveNarrationSeek(25, 5, cues, start)).toEqual(new Set([0.9, 4]));
  });

  it("re-arms the whole narration on replay from the completed frame", () => {
    expect(resolveNarrationSeek(69, 0, cues, start)).toEqual(new Set());
  });

  it("keeps small keyboard adjustments within the existing jitter tolerance", () => {
    expect(resolveNarrationSeek(7.35, 7.45, cues, start)).toBeNull();
    expect(resolveNarrationSeek(7.45, 7.35, cues, start)).toBeNull();
  });

  it("allows several legal clock frames to accumulate before a React effect observes them", () => {
    expect(resolveNarrationSeek(7.3, 7.3 + MAX_FRAME_DT * 5, cues, start)).toBeNull();
  });

  it("keeps ordinary advances, paused frames, and floating-point capped frames continuous", () => {
    expect(resolveNarrationSeek(3.99, 4.01, cues, start)).toBeNull();
    expect(resolveNarrationSeek(20, 20, cues, start)).toBeNull();
    expect(resolveNarrationSeek(281, 281 + MAX_FRAME_DT, cues, start)).toBeNull();
  });
});
