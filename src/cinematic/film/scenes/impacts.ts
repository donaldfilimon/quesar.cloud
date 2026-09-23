// impacts.ts — global cut/impact beats and their envelopes for the trailer.
// Split out of trailer_fx.tsx so that module exports only components.

// Global cut/impact beats (seconds) for the 59s cut. Camera + flash react to these.
export const IMPACTS = [
  0, 3.5, 7, 11, 14, 17, 21, 22.6, 24.2, 26, 29.4, 32, 35.4, 38, 43, 47, 51, 55, 59,
];

// impact envelope: 1 right after an impact, decays over `dur`.
export function impactK(t: number, dur = 0.42): number {
  let k = 0;
  for (let i = 0; i < IMPACTS.length; i++) {
    const im = IMPACTS[i]!;
    const dt = t - im;
    if (dt >= 0 && dt < dur) k = Math.max(k, 1 - dt / dur);
  }
  return k;
}
// alternating directional bias per impact index (for a kick)
export function impactKick(t: number, dur = 0.42): number {
  let best = 0,
    sign = 1;
  IMPACTS.forEach((im, i) => {
    const dt = t - im;
    if (dt >= 0 && dt < dur && 1 - dt / dur > best) {
      best = 1 - dt / dur;
      sign = i % 2 ? 1 : -1;
    }
  });
  return best * sign;
}
