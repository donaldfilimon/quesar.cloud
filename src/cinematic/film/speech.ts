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
   Playback is gated on the model being ready (see useVoiceGate), so a line is
   never crossed before the voice exists. If the model is unsupported or fails
   to load, or the viewer chooses to watch without it, the gate opens and
   captions carry the words. There is no Web Speech fallback. ─────────────── */

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

/* ── the voice gate ────────────────────────────────────────────────
   Nothing downloads until the viewer presses Play (requestVoice). The model is
   large, and loading it on page entry spent a visitor's bandwidth before they
   chose to watch. Lines primed before that are queued and warmed on request. */

let voiceRequested = false;
// Lines primed before the first Play, keyed so a remount (StrictMode, or
// leaving and re-entering a room) never queues the same line twice.
const pendingWarm = new Map<string, { who: string; text: string }>();
const lineKey = (line: { who: string; text: string }) => `${line.who}\u0000${line.text}`;

/**
 * Pre-render a room's lines in idle time so playback is gapless, once the
 * viewer has asked for the voice (warm() kicks the model download). Before
 * that the lines wait in a queue. Returns a cleanup that drops them from the
 * queue, so a room the viewer left is never synthesized ahead of the current
 * one.
 */
export function primeNeural(lines: Array<{ who?: PersonaKey | string; text: string }>): () => void {
  if (typeof window === "undefined") return () => {};
  const queued = lines.map((l) => ({ who: (l.who ?? "abbey") as string, text: l.text }));
  if (!voiceRequested) {
    for (const line of queued) pendingWarm.set(lineKey(line), line);
    return () => {
      for (const line of queued) pendingWarm.delete(lineKey(line));
    };
  }
  try {
    if (NeuralVoice.isSupported()) void NeuralVoice.warm(queued);
  } catch {
    /* noop */
  }
  return () => {};
}

/** Start the model download and warm the queued lines. Idempotent. */
export function requestVoice() {
  if (voiceRequested || typeof window === "undefined") return;
  voiceRequested = true;
  if (!NeuralVoice.isSupported()) return;
  NeuralVoice.load().catch(() => {});
  const queued = [...pendingWarm.values()];
  pendingWarm.clear();
  if (queued.length) void NeuralVoice.warm(queued).catch(() => {});
}

// True once playback may start: the model is ready, OR it can't/needn't run
// (muted, unsupported, or it gave up) — so we never hang the film forever.
function gateOpen(voiceOn: boolean, status: string | undefined): boolean {
  if (!voiceOn) return true;
  if (typeof window === "undefined" || !NeuralVoice.isSupported()) return true;
  return status === "ready" || status === "error";
}

export interface VoiceGate {
  /** Playback may run: the voice is ready, off, unsupported, or gave up. */
  ready: boolean;
  /** Model download progress, 0 to 1, while it loads. */
  progress: number;
  /** Begin loading the voice (the first Play). */
  request: () => void;
  /** Watch with captions only: turns the voice off, which opens the gate. */
  skip: () => void;
}

/** The Stage's voice gate, live against the model's status and the settings store. */
export function useVoiceGate(): VoiceGate {
  const voiceOn = useSettings().voiceOn;
  const [snapshot, setSnapshot] = useState(() =>
    typeof window === "undefined" ? null : NeuralVoice.snapshot(),
  );
  useEffect(() => NeuralVoice.onChange(setSnapshot), []);
  return {
    ready: gateOpen(voiceOn, snapshot?.status),
    progress: snapshot?.progress ?? 0,
    request: requestVoice,
    skip: () => setSetting("voiceOn", false),
  };
}

// karaoke timing: estimate spoken duration accounting for punctuation pauses
export function lineSpeechDur(text: string, rate: number): number {
  const words = text.trim().split(/\s+/).length;
  const commas = (text.match(/[,;:—]/g) || []).length;
  const stops = (text.match(/[.!?]/g) || []).length;
  return Math.max(1.4, words / (2.75 * (rate || 1)) + commas * 0.18 + stops * 0.32 + 0.35);
}
