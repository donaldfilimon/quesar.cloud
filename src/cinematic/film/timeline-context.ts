// timeline-context.ts — the Stage timeline and Sprite contexts plus their hooks.
// Lives outside engine.tsx so that module exports only components (fast refresh).

import { createContext, useContext } from "react";

export interface TimelineValue {
  // `time` is the displayed playhead (follows scrubber-hover preview) — render off it.
  // `clock` is the true playhead (ignores hover) — fire side effects (speech) off it.
  time: number; clock: number; duration: number; playing: boolean;
  setTime: (t: number | ((t: number) => number)) => void;
  setPlaying: (p: boolean | ((p: boolean) => boolean)) => void;
  // The Stage's unscaled root. Chrome that must keep its real pixel size (the
  // voice toggle) portals here instead of rendering inside the scaled picture,
  // which shrinks a 90×28 button to 22×7 at a 320 px viewport.
  chrome: HTMLElement | null;
}
export const TimelineContext = createContext<TimelineValue>({
  time: 0, clock: 0, duration: 10, playing: false, setTime: () => {}, setPlaying: () => {}, chrome: null,
});
export const useTime = () => useContext(TimelineContext).time;
export const useTimeline = () => useContext(TimelineContext);

export interface SpriteValue { localTime: number; progress: number; duration: number; visible: boolean; }
export const SpriteContext = createContext<SpriteValue>({ localTime: 0, progress: 0, duration: 0, visible: true });
export const useSprite = () => useContext(SpriteContext);
