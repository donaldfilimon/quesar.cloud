// engine-utils.ts — pure helpers used by the Stage in engine.tsx.

import { clamp } from "./easing";

/* ── reduced motion ───────────────────────────────────────────── */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type MatchMediaLike = (query: string) => { matches: boolean };

/**
 * True when the environment asks for reduced motion, in which case the Stage
 * clock holds instead of advancing. Takes the matchMedia function as a
 * parameter so the gating is testable in the Node-only Vitest setup; the
 * default reads `window.matchMedia` and answers false with no DOM or when the
 * browser lacks matchMedia.
 */
export function prefersReducedMotion(
  matchMedia: MatchMediaLike | undefined = typeof window !== "undefined" &&
  typeof window.matchMedia === "function"
    ? window.matchMedia.bind(window)
    : undefined,
): boolean {
  if (!matchMedia) return false;
  try {
    return matchMedia(REDUCED_MOTION_QUERY).matches === true;
  } catch {
    return false;
  }
}

/* ── canvas resolution ────────────────────────────────────────── */

/**
 * Backing-store ratio for a canvas drawn in the Stage's fixed 1920×1080 frame.
 * The frame is scaled by CSS, so the pixels actually shown are the device
 * pixel ratio times that scale; rendering more is invisible work (a phone
 * showed a 3840×2160 canvas at about 390 CSS px). Quantized to quarter steps
 * so a window resize does not reallocate the canvas every frame; capped at the
 * 2× the film was designed for.
 */
export function backingRatio(devicePixelRatio: number, stageScale: number): number {
  const wanted = (devicePixelRatio || 1) * (stageScale || 1);
  return clamp(Math.ceil(wanted * 4) / 4, 0.5, 2);
}

/* ── seeking ──────────────────────────────────────────────────── */

/**
 * Where a seek lands. A seek onto the end pauses: the clock's next frame would
 * otherwise wrap a looping film to 0, so End on the scrubber (and dragging it
 * to the far right) read as "jump to start". The transport's Play action
 * restarts a completed film deliberately; ordinary playback holds the end.
 * `atEnd` is never true for a
 * zero-length film, which has no last frame to hold.
 */
export function resolveSeek(t: number, duration: number): { time: number; atEnd: boolean } {
  const time = clamp(t, 0, duration);
  return { time, atEnd: duration > 0 && time >= duration };
}
