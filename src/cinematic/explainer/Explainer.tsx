import { FilmEvidence } from "../film/evidence";
// Explainer.tsx — the MLAI "What is MLAI?" cut. A calm, ~2:12 explainer that
// sits between the 62s vision trailer and the longer brand film. It is a pure
// curation of the existing system — every scene, the engine, the neural field,
// and the shared Kokoro neural voice are reused unchanged, so this cut stays in
// sync with every fix made to the underlying components (zero new scene code).
//
// Register: a fresh, clear Abbey narration — warm, metaphor-first, one tight
// thought per beat — over a steady (no impact-rig) neural background with
// modern emerald captions. Claims-disciplined: vision is labeled, not asserted.

import { useRef, useEffect, useMemo } from "react";
import { C, FONT, clamp } from "../film/tokens";
import { fade } from "../film/easing";
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
import { SceneOpen, SceneClose } from "../film/scenes/title";
import { Scene3 } from "../film/scenes/intro";
import { SceneStorage } from "../film/scenes/extra";
import { ScenePersonaRouting, SceneVerifiableMemory } from "../film/scenes/core";
import { SceneGovernance, SceneNorthStar } from "../film/scenes/outro";
import { BeatPersona } from "../film/scenes/beats";
import { Transcript } from "../film/transcript";
import { filmRecord, filmScript, filmTimeline, type NarrationLine } from "../catalog";

/* ── scene slots [start, end] in seconds — aligned to the narration ── */
const T = filmTimeline("explainer");
const DURATION = filmRecord("explainer").duration;

/* ── narration: Abbey, clear register (one thought per beat) ── */
type ELine = NarrationLine;
const SCRIPT = filmScript("explainer");

function activeLine(time: number): ELine | null {
  let cur: ELine | null = null;
  for (const l of SCRIPT) if (time >= l.t && time < l.t + l.dur) cur = l;
  return cur;
}

// Fires Abbey's lines off the true playhead (clock), so brushing the scrubber
// never mis-triggers speech. Mirrors the film/trailer/mega controllers.
function ExplainerNarration() {
  const { clock: time, playing } = useTimeline();
  const prev = useRef(0);
  const spoken = useRef<Set<number>>(new Set());
  useEffect(() => {
    const unprime = primeNeural(SCRIPT);
    return () => {
      unprime();
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    const p = prev.current;
    prev.current = time;
    const pastCues = resolveNarrationSeek(p, time, SCRIPT, (line) => line.t);
    if (pastCues) {
      stopSpeech();
      spoken.current = pastCues;
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

// Modern emerald caption with karaoke highlight. Token split is memoized per line.
function ExplainerCaption() {
  const { time, playing } = useTimeline();
  const line = activeLine(time);
  const { tokens, wordIdx } = useMemo(() => {
    if (!line) return { tokens: [] as string[], wordIdx: [] as number[] };
    const tk = line.text.split(/(\s+)/);
    return { tokens: tk, wordIdx: tk.map((t, i) => (/\S/.test(t) ? i : -1)).filter((i) => i >= 0) };
  }, [line]);
  if (!line) return null;
  const op = fade(time - line.t, line.dur, 0.3, 0.45);
  const frac = clamp((time - line.t) / lineSpeechDur(line.text, 0.97), 0, 1);
  const spokenCount = Math.floor(frac * wordIdx.length);
  let seen = 0;
  return (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 64,
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
          gap: 18,
          opacity: op,
          maxWidth: 1500,
          padding: "14px 30px",
          borderRadius: 999,
          background: "rgba(6,14,10,0.62)",
          border: `1px solid ${C.green}33`,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: `0 18px 60px rgba(0,0,0,0.5)`,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: C.green,
            boxShadow: `0 0 14px ${C.green}`,
            opacity: playing ? 0.55 + 0.45 * Math.sin(time * 6) : 0.4,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 13,
            letterSpacing: "0.28em",
            color: C.green,
            flexShrink: 0,
          }}
        >
          ABBEY
        </span>
        <span
          style={{
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 32,
            letterSpacing: "-0.01em",
            textShadow: "0 2px 24px rgba(0,0,0,0.85)",
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

/* ── calm neural background: an even colour drift, no impact rig ── */
function explainerMode(t: number): string {
  if (t < T.runtime[1]) return "build";
  if (t < T.minds[1]) return "resolve";
  if (t < T.govern[1]) return "order";
  if (t < T.vision[1]) return "fabric";
  return "bloom";
}
function ExplainerNeural() {
  const t = useTime();
  const diagram = [T.runtime, T.storage, T.memory, T.minds, T.govern, T.vision].some(
    ([start, end]) => t >= start && t < end,
  );
  return <NeuralLayer mode={explainerMode(t)} opacity={diagram ? 0.16 : 0.6} />;
}

/* ── the cut ── */
export function Explainer() {
  const voice = useVoiceGate();
  return (
    <Stage
      width={1920}
      height={1080}
      duration={DURATION}
      background="#040406"
      persistKey="mlai-explainer"
      voice={voice}
    >
      <ExplainerNeural />
      <GridBG opacity={0.26} />
      <Vignette />

      <Sprite start={T.open[0]} end={T.open[1]}>
        <SceneOpen />
      </Sprite>
      <Sprite start={T.runtime[0]} end={T.runtime[1]}>
        <Scene3 />
      </Sprite>
      <Sprite start={T.storage[0]} end={T.storage[1]}>
        <SceneStorage />
      </Sprite>
      <Sprite start={T.memory[0]} end={T.memory[1]}>
        <SceneVerifiableMemory />
      </Sprite>
      <Sprite start={T.minds[0]} end={T.minds[1]}>
        <ScenePersonaRouting />
      </Sprite>

      {/* three minds — each reveals with its own motion signature */}
      <Sprite start={T.pAbbey[0]} end={T.pAbbey[1]}>
        <BeatPersona name="Abbey" role="conversational · empathetic" accent={C.green} />
      </Sprite>
      <Sprite start={T.pAviva[0]} end={T.pAviva[1]}>
        <BeatPersona name="Aviva" role="direct · technical" accent={C.purple} />
      </Sprite>
      <Sprite start={T.pAbi[0]} end={T.pAbi[1]}>
        <BeatPersona name="Abi" role="orchestration · routing" accent={C.cyan} />
      </Sprite>

      <Sprite start={T.govern[0]} end={T.govern[1]}>
        <SceneGovernance />
      </Sprite>
      <Sprite start={T.vision[0]} end={T.vision[1]}>
        <SceneNorthStar />
      </Sprite>
      <Sprite start={T.close[0]} end={T.close[1]}>
        <SceneClose />
      </Sprite>

      {/* Abbey voiceover + caption */}
      <ExplainerNarration />
      <ExplainerCaption />
      <VoiceToggle />
      <Transcript lines={SCRIPT} />

      <Grain />
      <FilmEvidence id="explainer" />
    </Stage>
  );
}

export default Explainer;
