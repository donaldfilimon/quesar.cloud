import { FilmEvidence } from "../film/evidence";
// Mega.tsx — the MLAI Mega-Trailer. A 282s "longest, hardest-hitting cut" that
// interleaves kinetic trailer beats with the substantive film scenes over a
// full-bleed 3D neural field, driven by a handheld + impact camera rig.
//
// Incorporated from the design bundle's MLAI.html (the in-browser Babel build)
// into the typed module graph: every scene/beat/fx that the cut composes is now
// an explicit import from src/film/*, not a window global.
//
// Reuses the already-ported film scenes (Scene4/5/6/7) under their cut names,
// and hosts Abbey's voiceover via the shared Kokoro neural voice (captions
// carry the words when it cannot run).

import { useRef, useEffect, useMemo } from "react";
import { C, FONT } from "../film/tokens";
import { clamp, fade } from "../film/easing";
import { Stage, Sprite } from "../film/engine";
import { useTime, useTimeline } from "../film/timeline-context";
import { resolveNarrationSeek } from "../film/narration-seek";
import { Grain, Vignette, GridBG } from "../film/primitives";
import { NeuralLayer } from "../film/neural";
import { VoiceToggle } from "../film/narration";
import {
  speak,
  lineSpeechDur,
  stopSpeech,
  setSpeechPlaying,
  primeNeural,
  useVoiceGate,
} from "../film/speech";
import type { ReactNode } from "react";

// trailer fx + kinetic beats
import { SlamText, Stamp } from "../film/scenes/trailer_fx";
import {
  BeatOpen,
  BeatBigWord,
  BeatPersona,
  BeatMemory,
  BeatReason,
  BeatVision,
  BeatClose,
} from "../film/scenes/beats";
// substantive film scenes (Scene4/5/6/7 reuse the canonical ports under cut names)
import { Scene3 } from "../film/scenes/intro";
import {
  SceneStorage,
  SceneTemporal,
  ScenePersonaDeep,
  SceneClaims,
  SceneManifesto,
  SceneRoadmap,
} from "../film/scenes/extra";
import {
  ScenePersonaRouting as Scene4,
  SceneVerifiableMemory as Scene5,
} from "../film/scenes/core";
import { SceneGovernance as Scene6, SceneNorthStar as Scene7 } from "../film/scenes/outro";
import { MathScene } from "../film/scenes/math";
import { MATH } from "../film/scenes/math-data";
import { Transcript } from "../film/transcript";
import { filmRecord, filmScript, filmTimeline, type NarrationLine } from "../catalog";

/* ── timeline (seconds). Each entry [start, end]; scenes keep their length. ── */
const M = filmTimeline("mega");
const DURATION = filmRecord("mega").duration;

// fixed cinematic rig multipliers (no live Tweaks panel here)
const RIG = { shake: 0.4, zoom: 0.6, drift: 0.4, flash: 0.4 };

/* ── beat-aligned camera impacts (every hard cut kicks + flashes) ── */
const MEGA_IMPACTS = Object.values(M)
  .map((w) => w[0])
  .concat([2.2])
  .sort((a, b) => a - b);
function megaImpactK(t: number, dur = 0.42): number {
  let k = 0;
  for (const im of MEGA_IMPACTS) {
    const dt = t - im;
    if (dt >= 0 && dt < dur) k = Math.max(k, 1 - dt / dur);
  }
  return k;
}
function megaImpactKick(t: number, dur = 0.42): number {
  let best = 0,
    sign = 1;
  MEGA_IMPACTS.forEach((im, i) => {
    const dt = t - im;
    if (dt >= 0 && dt < dur && 1 - dt / dur > best) {
      best = 1 - dt / dur;
      sign = i % 2 ? 1 : -1;
    }
  });
  return best * sign;
}

/* ── neural background colour-act per time ── */
function megaMode(t: number): string {
  if (t < 7) return "chaos";
  if (t < 113.1) return "build";
  if (t < 171.1) return "resolve";
  if (t < 176.1) return "reason";
  if (t < 198.1) return "order";
  if (t < 241.1) return "fabric";
  if (t < 273.1) return "order";
  return "bloom";
}
function MegaNeural() {
  const t = useTime();
  // The final wordmark holds while its decorative field recedes.
  const close = clamp((t - M.close![0]) / 0.6, 0, 1);
  const diagram = [
    M.s3,
    M.stor,
    M.temp,
    M.s4,
    M.pDeep,
    M.s5,
    M.s6,
    M.claims,
    M.road,
    M.manif,
    M.math,
  ].some((range) => range && t >= range[0] && t < range[1]);
  return <NeuralLayer mode={megaMode(t)} opacity={diagram ? 0.16 : 1 - close * 0.84} />;
}

/* ── camera rig: continuous handheld drift + impact shake/zoom ──
   Under reduced motion the camera is locked off: no drift, shake, rotation or
   zoom punch. */
function MegaCamera({ children }: { children: ReactNode }) {
  const { time: t, reducedMotion } = useTimeline();
  if (reducedMotion) return <div style={{ position: "absolute", inset: 0 }}>{children}</div>;
  const { shake, zoom: zoomT, drift } = RIG;
  const k = megaImpactK(t),
    kick = megaImpactKick(t);
  const hx = (Math.sin(t * 0.6) * 8 + Math.sin(t * 0.27 + 1) * 5) * drift;
  const hy = (Math.cos(t * 0.5) * 6 + Math.cos(t * 0.33 + 2) * 4) * drift;
  const hrot = (Math.sin(t * 0.43) * 0.28 + Math.sin(t * 0.21) * 0.16) * drift;
  const sx = (k ? Math.sin(t * 94) * 14 * k : 0) * shake + kick * 26 * shake;
  const sy = (k ? Math.cos(t * 86) * 14 * k : 0) * shake;
  const srot = (k ? Math.sin(t * 70) * 0.7 * k : 0) * shake;
  const zoom = 1 + 0.022 * Math.sin(t * 0.4) + 0.075 * k * zoomT;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translate(${hx + sx}px, ${hy + sy}px) scale(${zoom}) rotate(${hrot + srot}deg)`,
        transformOrigin: "center",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

function MegaFlash({ color = "#bfe0ff" }: { color?: string }) {
  const { time: t, reducedMotion } = useTimeline();
  if (reducedMotion) return null;
  let op = 0;
  for (const im of MEGA_IMPACTS) {
    const dt = t - im;
    if (dt >= 0 && dt < 0.18) op = Math.max(op, (1 - dt / 0.18) * 0.5);
  }
  op *= RIG.flash;
  if (op < 0.01) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: color,
        opacity: op,
        zIndex: 80,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
}

/* ── Abbey VO — one smooth utterance per line, aligned to the timeline ── */
type MLine = NarrationLine;
const MEGA_SCRIPT = filmScript("mega");

function MegaNarration() {
  // Off the true playhead (clock), not the hover-preview time. See narration.tsx.
  const { clock: time, playing } = useTimeline();
  const prev = useRef(0);
  const spoken = useRef<Set<number>>(new Set());
  useEffect(() => {
    const unprime = primeNeural(MEGA_SCRIPT);
    return () => {
      unprime();
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    const p = prev.current;
    prev.current = time;
    const pastCues = resolveNarrationSeek(p, time, MEGA_SCRIPT, (line) => line.t);
    if (pastCues) {
      stopSpeech();
      spoken.current = pastCues;
      return;
    }
    if (!playing) return;
    for (const line of MEGA_SCRIPT) {
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

function megaActiveLine(time: number): MLine | null {
  let cur: MLine | null = null;
  for (const l of MEGA_SCRIPT) if (time >= l.t && time < l.t + l.dur) cur = l;
  return cur;
}

function MegaCaption() {
  const { time, playing } = useTimeline();
  const line = megaActiveLine(time);
  // Memoize the token split per line; only the karaoke fraction changes each frame.
  const { tokens, wordIdx } = useMemo(() => {
    if (!line) return { tokens: [] as string[], wordIdx: [] as number[] };
    const tk = line.text.split(/(\s+)/);
    return { tokens: tk, wordIdx: tk.map((t, i) => (/\S/.test(t) ? i : -1)).filter((i) => i >= 0) };
  }, [line]);
  if (!line) return null;
  const op = fade(time - line.t, line.dur, 0.22, 0.34);
  const frac = clamp((time - line.t) / lineSpeechDur(line.text, 0.96), 0, 1);
  const spokenCount = Math.floor(frac * wordIdx.length);
  let seen = 0;
  return (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 84,
        zIndex: 42,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: op,
          maxWidth: 1500,
          padding: "12px 30px",
          borderRadius: 16,
          background: "radial-gradient(120% 180% at 50% 50%, rgba(4,6,14,0.82), rgba(4,6,14,0))",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: C.cyan,
            boxShadow: `0 0 12px ${C.cyan}`,
            opacity: playing ? 0.5 + 0.5 * Math.sin(time * 7) : 0.4,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 12,
            letterSpacing: "0.28em",
            color: C.blueHi,
            flexShrink: 0,
          }}
        >
          ABBEY
        </span>
        <span
          style={{
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 29,
            letterSpacing: "-0.01em",
            textShadow: "0 2px 24px rgba(0,0,0,0.95)",
          }}
        >
          {tokens.map((tk, i) => {
            if (!/\S/.test(tk)) return tk;
            const lit = seen < spokenCount;
            seen++;
            return (
              <span
                key={i}
                style={{ color: lit ? C.text : C.dim, transition: "color 90ms linear" }}
              >
                {tk}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}

function ScreenLabel() {
  const t = useTime();
  const sec = Math.floor(t);
  useEffect(() => {
    const r = document.getElementById("video-root");
    if (r) r.setAttribute("data-screen-label", `t=${sec}s`);
  }, [sec]);
  return null;
}

function MegaGrain() {
  useTime();
  return <Grain />;
}

/* ── the cut ── */
export function Mega() {
  const math0 = MATH[0]!;
  const voice = useVoiceGate();
  return (
    <Stage
      width={1920}
      height={1080}
      duration={DURATION}
      background="#030408"
      persistKey="mlai-mega"
      voice={voice}
    >
      <GridBG opacity={0.34} />
      <Vignette />

      <MegaCamera>
        {/* full-bleed neural field behind everything */}
        <MegaNeural />

        {/* ACT 0 — power-up */}
        <Sprite start={M.open![0]} end={M.open![1]}>
          <BeatOpen />
        </Sprite>
        <Sprite start={0.4} end={M.open![1]}>
          <SlamText text={"A QUESTION."} size={150} x={960} y={862} color={C.text} />
        </Sprite>
        <Sprite start={M.ask![0]} end={M.ask![1]}>
          <div style={{ position: "absolute", inset: 0 }}>
            <SlamText text={"WHAT IS"} size={120} x={960} y={430} color={C.dim} chroma={false} />
          </div>
        </Sprite>
        <Sprite start={M.ask![0] + 0.4} end={M.ask![1]}>
          <Stamp text={"THE EVIDENCE?"} color={C.red} x={960} y={604} rotate={-7} size={110} />
        </Sprite>
        <Sprite start={M.fixed![0]} end={M.fixed![1]}>
          <BeatBigWord word={"INSPECT THE SOURCE."} size={135} />
        </Sprite>

        {/* ACT I — the runtime */}
        <Sprite start={M.oneRun![0]} end={M.oneRun![1]}>
          <BeatBigWord word={"SOURCE FOUNDATIONS."} size={135} />
        </Sprite>
        <Sprite start={M.s3![0]} end={M.s3![1]}>
          <Scene3 />
        </Sprite>
        <Sprite start={M.stor![0]} end={M.stor![1]}>
          <SceneStorage />
        </Sprite>
        <Sprite start={M.temp![0]} end={M.temp![1]}>
          <SceneTemporal />
        </Sprite>

        {/* ACT II — three minds */}
        <Sprite start={M.threeM![0]} end={M.threeM![1]}>
          <BeatBigWord word={"THREE PROFILES."} size={200} />
        </Sprite>
        <Sprite start={M.pAbbey![0]} end={M.pAbbey![1]}>
          <BeatPersona name="Abbey" role="conversational · empathetic" accent={C.green} />
        </Sprite>
        <Sprite start={M.pAviva![0]} end={M.pAviva![1]}>
          <BeatPersona name="Aviva" role="direct · technical" accent={C.purple} />
        </Sprite>
        <Sprite start={M.pAbi![0]} end={M.pAbi![1]}>
          <BeatPersona name="Abi" role="orchestration · routing" accent={C.cyan} />
        </Sprite>
        <Sprite start={M.s4![0]} end={M.s4![1]}>
          <Scene4 />
        </Sprite>
        <Sprite start={M.pDeep![0]} end={M.pDeep![1]}>
          <ScenePersonaDeep />
        </Sprite>

        {/* ACT III — the proof */}
        <Sprite start={M.verify![0]} end={M.verify![1]}>
          <BeatBigWord word={"INTEGRITY CHECKS."} size={200} />
        </Sprite>
        <Sprite start={M.s5![0]} end={M.s5![1]}>
          <Scene5 />
        </Sprite>
        <Sprite start={M.mem![0]} end={M.mem![1]}>
          <BeatMemory />
        </Sprite>
        <Sprite start={M.mem![0] + 1.9} end={M.mem![1] - 0.5}>
          <Stamp text={"AUDIT CHAIN"} color={C.green} x={960} y={764} rotate={-6} size={70} />
        </Sprite>
        <Sprite start={M.s6![0]} end={M.s6![1]}>
          <Scene6 />
        </Sprite>
        <Sprite start={M.s6![1] - 4} end={M.s6![1] - 0.5}>
          <div data-audit-stamp="">
            <Stamp text={"SCOPED AUDIT"} color={C.cyan} x={1600} y={760} rotate={-3} size={32} />
          </div>
        </Sprite>
        <Sprite start={M.claims![0]} end={M.claims![1]}>
          <SceneClaims />
        </Sprite>

        {/* ACT IV — reasoning */}
        <Sprite start={M.reason![0]} end={M.reason![1]}>
          <BeatReason />
        </Sprite>

        {/* ACT V — the vision */}
        <Sprite start={M.roadW![0]} end={M.roadW![1]}>
          <BeatBigWord word={"THE ROADMAP."} size={170} />
        </Sprite>
        <Sprite start={M.s7![0]} end={M.s7![1]}>
          <Scene7 />
        </Sprite>
        <Sprite start={M.vis![0]} end={M.vis![1]}>
          <BeatVision />
        </Sprite>
        <Sprite start={M.road![0]} end={M.road![1]}>
          <SceneRoadmap />
        </Sprite>
        <Sprite start={M.manif![0]} end={M.manif![1]}>
          <SceneManifesto />
        </Sprite>

        {/* ACT VI — the mathematics */}
        <Sprite start={M.math![0]} end={M.math![1]}>
          <MathScene d={math0} />
        </Sprite>

        {/* ACT VII — title + close */}
        <Sprite start={M.word![0]} end={M.word![1]}>
          <BeatBigWord word={"MLAI"} size={420} />
        </Sprite>
        <Sprite start={M.close![0]} end={M.close![1]}>
          <div data-film-closing="mega">
            <BeatClose hold />
          </div>
        </Sprite>
      </MegaCamera>

      <MegaFlash />
      <MegaGrain />

      <MegaNarration />
      <MegaCaption />
      <ScreenLabel />
      <VoiceToggle />
      <Transcript lines={MEGA_SCRIPT} />
      <FilmEvidence id="mega" />
    </Stage>
  );
}
