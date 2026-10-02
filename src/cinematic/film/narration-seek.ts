const SEEK_TOLERANCE = 0.35;

/**
 * Stage caps each frame at MAX_FRAME_DT (1/15s), but React may batch several
 * frames before this effect observes them. Preserve the existing 0.35s jitter
 * tolerance in both directions: larger jumps are seeks, replays, or restored
 * playheads rather than a sequence of narration crossings.
 *
 * On a seek, callers stop the old speech and replace their spoken history with
 * this set. Only cues at or before the new position are past: a cue immediately
 * after it must remain armed for its next actual clock crossing. null means the
 * clock is continuous and the caller can process crossings normally.
 */
export function resolveNarrationSeek<T>(
  previous: number,
  current: number,
  cues: readonly T[],
  start: (cue: T) => number,
): Set<number> | null {
  if (Math.abs(current - previous) <= SEEK_TOLERANCE) return null;
  return new Set(cues.map(start).filter((time) => time <= current));
}
