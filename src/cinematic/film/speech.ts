// speech.ts — voice settings store and the neural speech controls behind the
// brand-film narration. Split out of narration.tsx so that module exports only
// components (fast refresh). This module owns the single settings store; every
// consumer reads and writes it through the functions below.

import { useEffect, useState, useSyncExternalStore } from "react";
import { clamp, type PersonaKey } from "./tokens";
import { NeuralVoice } from "./neural-voice";

/* ── settings store (external, subscribable) ──────────────────────── */

export interface Settings {
  voiceOn: boolean;
  captions: boolean;
  rate: number;
  volume: number;
}
// Reassigned (not mutated) on every change so getSnapshot returns a fresh reference —
// useSyncExternalStore compares snapshots by Object.is, so an in-place mutation would
// be ignored and the toggle/captions UI would never re-render. (`rate` only scales the
// caption karaoke estimate; the neural model owns prosody — see PROSODY in neural-voice.ts.)
let settings: Settings = { voiceOn: true, captions: true, rate: 0.98, volume: 1 };
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function getSettings(): Settings {
  return settings;
}
export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  settings = { ...settings, [k]: v };
  emit();
}
export function useSettings(): Settings {
  return useSyncExternalStore(
    subscribe,
    () => settings,
    () => settings,
  );
}

/* ── speech: the neural model is the only engine ──────────────────────
   All three minds (Abbey/Aviva/Abi) speak through Kokoro (neural-voice.ts).
   Playback is gated on the model being ready (see useVoiceReady), so a line is
   never crossed before the voice exists — nothing is dropped or silent. If the
   model is unsupported or fails to load, the gate opens anyway and captions
   carry the words. ──────────────────────────────────────────────────────── */

export function speak(who: PersonaKey, text: string) {
  if (typeof window === "undefined" || !settings.voiceOn) return;
  if (!NeuralVoice.isSupported()) return; // no engine → captions carry the words
  // force: true — the film is an explicit opt-in surface (the user navigated to
  // it, the VoiceToggle is on, and the AudioContext is already gated behind a
  // user gesture), so it speaks even under prefers-reduced-motion; the gate
  // still protects any non-film / autoplay caller of NeuralVoice.speak.
  NeuralVoice.speak(who, text, { volume: clamp(settings.volume, 0, 1), force: true }).catch(
    () => {},
  );
}

// Stop speech (e.g. seek-back, voice-off, navigation).
export function stopSpeech() {
  try {
    NeuralVoice.stop();
  } catch {
    /* noop */
  }
}

// Mirror play/pause to the model so neural audio doesn't keep playing on pause.
export function setSpeechPlaying(playing: boolean) {
  try {
    if (!NeuralVoice.isSupported()) return;
    if (playing) NeuralVoice.resume();
    else NeuralVoice.pause();
  } catch {
    /* noop */
  }
}

// Pre-render a script's lines in idle time so playback is gapless. warm() itself
// kicks the model download.
export function primeNeural(lines: Array<{ who?: PersonaKey | string; text: string }>) {
  if (typeof window === "undefined") return;
  try {
    if (!NeuralVoice.isSupported()) return;
    NeuralVoice.warm(lines.map((l) => ({ who: (l.who ?? "abbey") as string, text: l.text })));
  } catch {
    /* noop */
  }
}

// True once playback may start: the model is ready, OR it can't/needn't run
// (muted, unsupported, or it gave up) — so we never hang the film forever.
function voiceGateOpen(): boolean {
  if (!settings.voiceOn) return true;
  if (typeof window === "undefined" || !NeuralVoice.isSupported()) return true;
  const s = NeuralVoice.status();
  return s === "ready" || s === "error";
}

// Hook for a <Stage ready={…}> gate: kicks the model load and flips true when the
// voice is ready (polls status — load has no synchronous "done" signal).
export function useVoiceReady(): boolean {
  const [ready, setReady] = useState(() => voiceGateOpen());
  useEffect(() => {
    if (ready) return;
    NeuralVoice.load().catch(() => {});
    const iv = setInterval(() => {
      if (voiceGateOpen()) {
        setReady(true);
        clearInterval(iv);
      }
    }, 200);
    return () => clearInterval(iv);
  }, [ready]);
  return ready;
}

// karaoke timing: estimate spoken duration accounting for punctuation pauses
export function lineSpeechDur(text: string, rate: number): number {
  const words = text.trim().split(/\s+/).length;
  const commas = (text.match(/[,;:—]/g) || []).length;
  const stops = (text.match(/[.!?]/g) || []).length;
  return Math.max(1.4, words / (2.75 * (rate || 1)) + commas * 0.18 + stops * 0.32 + 0.35);
}
