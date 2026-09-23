// neural-mode.ts — MLAI colour presets for the neural backdrop and the film's
// time→mode mapping. Split out of neural.tsx so that module exports only
// components (fast refresh).

import type { NeuralModePreset } from "@/lib/trailer-engine";

export const NL_MODES = {
  chaos:   { order: 0.05, radial: 0, hue: [255, 90, 84],  spd: 1.5, waves: 3, glow: 0.8 },
  resolve: { order: 0.55, radial: 0, hue: [90, 230, 170],  spd: 1.1, waves: 2, glow: 1.0 },
  build:   { order: 0.93, radial: 0, hue: [80, 175, 255],  spd: 1.6, waves: 2, glow: 1.15 },
  order:   { order: 1.0,  radial: 0, hue: [95, 205, 255],  spd: 2.0, waves: 3, glow: 1.2 },
  reason:  { order: 1.0,  radial: 0, hue: [120, 230, 255], spd: 2.7, waves: 4, glow: 1.4 },
  fabric:  { order: 1.0,  radial: 1, hue: [185, 140, 255], spd: 1.2, waves: 2, glow: 1.2 },
  bloom:   { order: 1.0,  radial: 1, hue: [215, 238, 255], spd: 0.8, waves: 1, glow: 1.55 },
} as const satisfies Record<string, NeuralModePreset>;

export type NeuralMode = keyof typeof NL_MODES;

export function neuralModeForTime(t: number): NeuralMode {
  if (t < 7) return 'chaos';
  if (t < 11) return 'resolve';
  if (t < 26) return 'build';
  if (t < 38) return 'order';
  if (t < 43) return 'reason';
  if (t < 59) return 'fabric';
  return 'bloom';
}
