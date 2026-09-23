// narration-script.ts — the brand film's voiceover script (data only), split
// out of narration.tsx so that module exports only components (fast refresh).

import { clamp, type PersonaKey } from "./tokens";

/* ── script: lines pinned to the 69s, six-scene timeline ──────────── */

export interface ScriptLine { t: number; who: PersonaKey; text: string; dur: number }

const RAW: Array<Omit<ScriptLine, "dur">> = [
  // 00 · cold open  [0–9]
  { t: 1.0, who: "abbey", text: "Hello — I'm Abbey, one of three minds inside this system." },
  { t: 4.6, who: "abbey", text: "Infrastructure for resilient intelligence. Let me show you how it holds." },
  // 01 · persona routing  [9–22]
  { t: 9.6, who: "abi", text: "I'm Abi. Every query is scored, then routed to the right mind." },
  { t: 13.8, who: "abi", text: "Analysis goes to Abbey, creative work to Aviva, fast execution to me." },
  { t: 18.2, who: "abi", text: "Deterministic, local, explainable — you always know who answered, and why." },
  // 02 · verifiable memory  [22–37]
  { t: 22.8, who: "abbey", text: "What we learn, we remember — searchable by meaning." },
  { t: 27.4, who: "abbey", text: "And sealed in a SHA-256 chain, where every block hashes the one before it." },
  { t: 32.2, who: "abbey", text: "Alter a single block and the whole chain rejects it. Tampering can't hide." },
  // 03 · governance  [37–51]
  { t: 37.8, who: "abbey", text: "Before any response reaches you, it's checked against six principles." },
  { t: 42.4, who: "abbey", text: "Truthfulness, safety, helpfulness, fairness, privacy, transparency." },
  { t: 47.0, who: "abbey", text: "Six principles. Every response, governed." },
  // 04 · north-star (vision)  [51–60]
  { t: 51.6, who: "aviva", text: "I'm Aviva. The north-star is a distributed cognitive fabric, across every tier of hardware." },
  { t: 56.2, who: "aviva", text: "That part is still vision — a direction, not yet a promise." },
  // 05 · resolution  [60–69]
  { t: 60.6, who: "abbey", text: "Phase one is real and tested. Everything beyond it is the plan." },
  { t: 64.8, who: "abbey", text: "This is MLAI. Infrastructure for resilient intelligence." },
];

export const SCRIPT: ScriptLine[] = RAW
  .map((l) => ({ ...l, dur: clamp(l.text.length / 15 + 1.0, 3.2, 8) }))
  .sort((a, b) => a.t - b.t);
