// AbbeyTrailer.tsx — the "MLAI & Abbey" trailer shell.
//
// The picture is a SceneSequencer over the extracted engine; this file owns
// the Stage (clock, transport, scrub bar, persistence), the canvas element and
// the caption overlay. The canvas redraws once per timeline tick, so the host
// keeps cadence and the sequencer keeps the lifecycle honest. Scrubs are
// forwarded as seek() so a jump lands on the frame playing would have reached;
// ordinary playback goes through draw(), which clamps stalls.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Canvas2DRenderer, ParticleBuffer, SceneSequencer } from "@/lib/trailer-engine";
import { C, FONT, PERSONAS } from "../film/tokens";
import { fade } from "../film/easing";
import { Stage } from "../film/engine";
import { useTimeline } from "../film/timeline-context";
import { backingRatio } from "../film/engine-utils";
import { Transcript } from "../film/transcript";
import { VoiceToggle } from "../film/narration";
import { primeNeural, setSpeechPlaying, speak, stopSpeech, useVoiceGate } from "../film/speech";
import { Grain, Vignette } from "../film/primitives";
import { buildAbbeyTimeline, captionAt, type AbbeyTimeline } from "./scenes";

const W = 1920,
  H = 1080;
/** A jump larger than this between ticks is a scrub, not a stall. */
const SCRUB_THRESHOLD = 0.5;

function useAbbeyTimeline(): AbbeyTimeline {
  return useMemo(
    () =>
      buildAbbeyTimeline({
        abi: PERSONAS.abi.color,
        aviva: PERSONAS.aviva.color,
        abbey: PERSONAS.abbey.color,
        ink: C.bg,
        text: C.text,
        dim: C.dim,
      }),
    [],
  );
}

/** Frame-time budget: above this exponential average, drop detail one notch. */
const SLOW_FRAME_MS = 14;
const FAST_FRAME_MS = 7;
const QUALITY_STEP = 0.2;
const QUALITY_FLOOR = 0.3;

function AbbeyCanvas({ timeline }: { timeline: AbbeyTimeline }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stage = useRef<{ renderer: Canvas2DRenderer; sequencer: SceneSequencer } | null>(null);
  const lastT = useRef<number | null>(null);
  const lastCue = useRef<string | null>(null);
  const frameMs = useRef(0);
  const sizedTo = useRef(0);
  const [settled, setSettled] = useState(true);
  // The Stage owns the live reduced-motion query; the film plays either way.
  const { time, reducedMotion: reduced, scale } = useTimeline();
  const ratio = backingRatio(typeof window === "undefined" ? 1 : window.devicePixelRatio, scale);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const renderer = new Canvas2DRenderer(c);
    renderer.resize(W, H, 1);
    const sequencer = new SceneSequencer(timeline.cues, { particles: new ParticleBuffer(1600) });
    renderer.setScene(sequencer);
    stage.current = { renderer, sequencer };
    lastT.current = null;
    lastCue.current = null;
    sizedTo.current = 0;
    return () => {
      stage.current = null;
      sequencer.dispose();
      renderer.dispose();
    };
  }, [timeline]);

  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    const prev = lastT.current;
    lastT.current = time;
    // Resizing clears the canvas; forgetting the cue makes both branches redraw.
    if (sizedTo.current !== ratio) {
      s.renderer.resize(W, H, ratio);
      sizedTo.current = ratio;
      lastCue.current = null;
    }

    if (reduced) {
      // Reduced motion is a different grammar, not fewer particles: each cue is
      // shown as its settled constellation and cues change with a fade, so no
      // continuous motion is ever drawn.
      const cue = s.sequencer.cueAt(time);
      const name = cue?.name ?? null;
      if (name === lastCue.current) return;
      lastCue.current = name;
      setSettled(false);
      const settleAt = cue ? cue.start + cue.duration - 0.05 : time;
      s.sequencer.seek(settleAt, W, H);
      s.renderer.render(settleAt);
      const id = window.setTimeout(() => setSettled(true), 60);
      return () => window.clearTimeout(id);
    }

    if (prev !== null && Math.abs(time - prev) > SCRUB_THRESHOLD) s.sequencer.seek(time, W, H);
    const t0 = performance.now();
    s.renderer.render(time);
    // Adaptive quality from measured frame time only: an exponential average of
    // the draw cost steps the detail budget down when frames run long and back
    // up when there is headroom. The change lands at the next cue or seek.
    const cost = performance.now() - t0;
    frameMs.current = frameMs.current === 0 ? cost : frameMs.current * 0.9 + cost * 0.1;
    const q = s.sequencer.currentQuality;
    if (frameMs.current > SLOW_FRAME_MS && q > QUALITY_FLOOR) {
      s.sequencer.setQuality(Math.max(QUALITY_FLOOR, q - QUALITY_STEP));
      frameMs.current = SLOW_FRAME_MS * 0.6; // let the new budget prove itself before the next step
    } else if (frameMs.current < FAST_FRAME_MS && q < 1) {
      s.sequencer.setQuality(Math.min(1, q + QUALITY_STEP));
      frameMs.current = FAST_FRAME_MS * 1.4;
    }
  }, [time, reduced, ratio]);

  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    opacity: settled ? 1 : 0,
    transition: reduced ? "opacity 400ms ease" : "none",
  };
  return <canvas ref={ref} style={style} aria-hidden="true" />;
}

function AbbeyCaption({ timeline }: { timeline: AbbeyTimeline }) {
  const { time } = useTimeline();
  const line = captionAt(timeline.captions, time);
  const persona = line?.who ? PERSONAS[line.who] : null;
  const opacity = line ? fade(time - line.start, line.end - line.start, 0.25, 0.3) : 0;
  return (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 72,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity,
          maxWidth: 1500,
          padding: "0 40px",
        }}
      >
        {persona && (
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 13,
              letterSpacing: "0.28em",
              color: persona.color,
              flexShrink: 0,
            }}
          >
            {persona.name.toUpperCase()}
          </span>
        )}
        <span
          style={{
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: "-0.01em",
            color: C.text,
            textShadow: "0 2px 24px rgba(0,0,0,0.85)",
          }}
        >
          {line?.text ?? ""}
        </span>
      </div>
    </div>
  );
}

// Fires each caption's line through the shared voice engine as the true
// playhead (clock, not the hover-preview time) crosses its start; a seek back
// stops speech and re-arms the lines behind the new position. Same contract as
// Trailer.tsx, so the voice toggle and reduced-motion gating behave the same.
function AbbeyNarration({ timeline }: { timeline: AbbeyTimeline }) {
  const { clock: time, playing } = useTimeline();
  const prev = useRef(0);
  const spoken = useRef<Set<number>>(new Set());
  useEffect(() => {
    const unprime = primeNeural(
      timeline.captions.map((c) => ({ who: c.who ?? "abbey", text: c.text })),
    );
    return () => {
      unprime();
      stopSpeech();
    };
  }, [timeline]);
  useEffect(() => {
    const p = prev.current;
    prev.current = time;
    if (time < p - 0.35) {
      stopSpeech();
      spoken.current = new Set(
        timeline.captions.filter((c) => c.start <= time + 0.05).map((c) => c.start),
      );
      return;
    }
    if (!playing) return;
    for (const c of timeline.captions) {
      if (p < c.start && time >= c.start && !spoken.current.has(c.start)) {
        spoken.current.add(c.start);
        speak(c.who ?? "abbey", c.text);
      }
    }
  }, [time, playing, timeline]);
  useEffect(() => {
    setSpeechPlaying(playing);
  }, [playing]);
  return null;
}

export function AbbeyTrailer() {
  const timeline = useAbbeyTimeline();
  const voice = useVoiceGate();
  return (
    <Stage
      width={W}
      height={H}
      duration={timeline.duration}
      background={C.bg}
      persistKey="mlai-abbey"
      voice={voice}
    >
      <AbbeyCanvas timeline={timeline} />
      <Vignette />
      <AbbeyCaption timeline={timeline} />
      <AbbeyNarration timeline={timeline} />
      <Transcript lines={timeline.captions} />
      <VoiceToggle />
      <Grain />
    </Stage>
  );
}
