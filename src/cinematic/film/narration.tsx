// narration.tsx — Abbey / Aviva / Abi voiceover for the brand film.
//
// Ported from the design bundle's narration.jsx into a typed, self-contained
// React module. Three "minds" host the film, synced to the timeline:
//   · Abbey  — empathic polymath (proof / verified)   · green
//   · Aviva  — research / vision                       · violet
//   · Abi    — adaptive router (interactive / fast)    · cyan
//
// Speech rides the Web Speech API and degrades to captions-only gracefully.
// A small external store (speech.ts) carries live settings (voice on/off, rate, pitch …) so
// the toggle, controller, and caption bar stay in sync without prop-drilling.

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { C, FONT, PERSONAS, clamp, type PersonaKey } from "./tokens";
import { SCRIPT, type ScriptLine } from "./narration-script";
import { step, fade } from "./easing";
import { useTimeline } from "./timeline-context";
import { NeuralVoice } from "./neural-voice";
import {
  getSettings,
  lineSpeechDur,
  primeNeural,
  setSetting,
  setSpeechPlaying,
  speak,
  stopSpeech,
  useSettings,
} from "./speech";

/* The script (lines pinned to the 69s, six-scene timeline) lives in
   narration-script.ts. */

/* speaker styling — drives the caption avatar + waveform */
const SPEAKERS: Record<
  PersonaKey,
  { name: string; accent: string; g0: string; g1: string; wave: string }
> = {
  abbey: { name: "ABBEY", accent: C.green, g0: "#6ee7b7", g1: "#047857", wave: "#34d399" },
  aviva: { name: "AVIVA", accent: C.violet, g0: "#c4b5fd", g1: "#6d28d9", wave: "#c084fc" },
  abi: { name: "ABI", accent: C.cyan, g0: "#a5f3fc", g1: "#0e7490", wave: "#22d3ee" },
};

function activeLine(time: number): ScriptLine | null {
  let cur: ScriptLine | null = null;
  for (const l of SCRIPT) if (time >= l.t && time <= l.t + l.dur) cur = l;
  return cur;
}

/* ── controller: fires speech off the playhead ────────────────────── */

export function NarrationController() {
  // Fire speech off the true playhead (clock), not the hover-preview time — otherwise
  // brushing the scrubber marks lines "spoken" and skips them during real playback.
  const { clock: time, playing } = useTimeline();
  const prev = useRef(0);
  const spoken = useRef<Set<number>>(new Set());

  // prewarm the neural model with this film's lines (idle-time, gapless playback);
  // stop all speech when the surface unmounts (e.g. navigating back).
  useEffect(() => {
    primeNeural(SCRIPT);
    return () => stopSpeech();
  }, []);

  useEffect(() => {
    const p = prev.current;
    prev.current = time;
    if (time < p - 0.35) {
      // seek / loop back
      stopSpeech();
      spoken.current = new Set(SCRIPT.filter((l) => l.t <= time + 0.05).map((l) => l.t));
      return;
    }
    if (!playing) return;
    for (const line of SCRIPT) {
      if (p < line.t && time >= line.t && !spoken.current.has(line.t)) {
        spoken.current.add(line.t);
        speak(line.who, line.text);
      }
    }
  }, [time, playing]);

  useEffect(() => {
    setSpeechPlaying(playing);
  }, [playing]);

  return null;
}

/* ── caption bar with karaoke highlight ───────────────────────────── */

export function Narrator() {
  const { time, playing } = useTimeline();
  const c = useSettings();
  const line = activeLine(time);
  // tokens/wordIdx are constant while a line is active (~3s); only the karaoke
  // fraction is time-dependent. Memoize the split instead of re-running it every frame.
  const { tokens, wordIdx } = useMemo(() => {
    if (!line) return { tokens: [] as string[], wordIdx: [] as number[] };
    const tk = line.text.split(/(\s+)/);
    return { tokens: tk, wordIdx: tk.map((t, i) => (/\S/.test(t) ? i : -1)).filter((i) => i >= 0) };
  }, [line]);
  if (!c.captions) return null;
  const sp = SPEAKERS[line?.who ?? "abbey"];
  const intro = step(Math.max(0, time - 0.4), 0, 0.8);
  const speaking = !!line && playing && c.voiceOn;
  const localOpacity = line ? fade(time - line.t, line.dur, 0.35, 0.5) : 0;
  const frac = line ? clamp((time - line.t) / lineSpeechDur(line.text, c.rate), 0, 1) : 0;
  const spokenCount = Math.floor(frac * wordIdx.length);
  let wordSeen = 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 40,
        zIndex: 40,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: intro,
        transform: `translateY(${(1 - intro) * 18}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          maxWidth: 1500,
          padding: "16px 30px 16px 18px",
          borderRadius: 999,
          background: "rgba(8,10,18,0.66)",
          border: `1px solid ${C.line}`,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* avatar */}
        <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, ${sp.g0}, ${sp.g1})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 27,
              color: "#fff",
              boxShadow: speaking ? `0 0 22px ${sp.accent}cc` : `0 0 10px ${sp.accent}55`,
              transition: "background 400ms, box-shadow 200ms",
            }}
          >
            {sp.name[0]}
          </div>
          {speaking && (
            <span
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                border: `1.5px solid ${sp.wave}`,
                opacity: 0.4 + 0.4 * Math.sin(time * 6),
              }}
            />
          )}
        </div>
        {/* name + waveform */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, width: 96 }}>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 13,
              letterSpacing: "0.24em",
              color: sp.accent,
            }}
          >
            {sp.name}
          </span>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 16 }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const h = speaking ? 4 + 11 * Math.abs(Math.sin(time * (5 + i) + i)) : 3;
              return (
                <span
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    borderRadius: 2,
                    background: speaking ? sp.wave : C.dim2,
                  }}
                />
              );
            })}
          </div>
        </div>
        {/* caption with karaoke highlight */}
        <div
          style={{
            minWidth: 0,
            maxWidth: 1180,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 30,
            lineHeight: 1.3,
            opacity: localOpacity,
          }}
        >
          {tokens.map((tk, i) => {
            if (!/\S/.test(tk)) return tk;
            const lit = wordSeen < spokenCount;
            wordSeen++;
            return (
              <span
                key={i}
                style={{ color: lit ? C.text : C.dim, transition: "color 90ms linear" }}
              >
                {tk}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── always-visible voice toggle ──────────────────────────────────── */

export function VoiceToggle() {
  const c = useSettings();
  // Render into the Stage's unscaled root when there is one: inside the scaled
  // picture the toggle shrank with it (22×7 px at a 320 px viewport). Outside a
  // Stage it renders in place, as before.
  const { chrome } = useTimeline();
  useEffect(() => {
    // browsers gate the AudioContext behind a user gesture — use the first
    // interaction to start downloading the neural model.
    const kick = () => {
      try {
        if (NeuralVoice.isSupported()) NeuralVoice.load().catch(() => {});
      } catch {
        /* noop */
      }
    };
    window.addEventListener("pointerdown", kick);
    return () => window.removeEventListener("pointerdown", kick);
  }, []);
  const toggle = () => {
    const next = !getSettings().voiceOn;
    setSetting("voiceOn", next);
    if (!next) stopSpeech();
  };
  const on = c.voiceOn;
  const button = (
    <button
      type="button"
      onClick={toggle}
      title="Agent voiceover"
      aria-pressed={on}
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        gap: 9,
        minHeight: 36,
        padding: "9px 15px 9px 11px",
        borderRadius: 999,
        cursor: "pointer",
        background: on ? "rgba(52,211,153,0.16)" : "rgba(20,20,28,0.8)",
        border: `1px solid ${on ? C.green + "88" : C.line}`,
        color: on ? C.green : C.dim,
        fontFamily: FONT.mono,
        fontSize: 13,
        letterSpacing: "0.12em",
        backdropFilter: "blur(10px)",
      }}
    >
      <span style={{ fontSize: 15 }} aria-hidden="true">
        {on ? "🔊" : "🔇"}
      </span>
      VOICE {on ? "ON" : "OFF"}
    </button>
  );
  return chrome ? createPortal(button, chrome) : button;
}

export { PERSONAS };
