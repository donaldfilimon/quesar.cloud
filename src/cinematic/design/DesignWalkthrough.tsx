import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { designShots, filmRecord, filmScript } from "../catalog";
import { Stage } from "../film/engine";
import { useTimeline } from "../film/timeline-context";
import { VoiceToggle } from "../film/narration";
import { Transcript } from "../film/transcript";
import { primeNeural, setSpeechPlaying, speak, stopSpeech, useVoiceGate } from "../film/speech";
import { resolveNarrationSeek } from "../film/narration-seek";
import { BOARDS } from "./boards";
import { DesignHub } from "./DesignHub";
import { isCapture, applyDirectedScroll } from "../film/capture";

const SCRIPT = filmScript("design");

function Shot() {
  const { time, playing } = useTimeline();
  const chapter =
    designShots.find((shot) => time < shot.end) ?? designShots[designShots.length - 1];
  const scroller = useRef<HTMLDivElement>(null);
  const { shot } = chapter;
  const Active = BOARDS[shot.board];
  const local = time - chapter.start;
  const progress = Math.max(
    0,
    Math.min(
      1,
      (local - shot.scroll.startOffset) / (shot.scroll.endOffset - shot.scroll.startOffset),
    ),
  );
  const scrollFraction = shot.scroll.from + (shot.scroll.to - shot.scroll.from) * progress;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const scroll = () => {
      applyDirectedScroll(el);
      if (!isCapture())
        for (const animation of el.getAnimations({ subtree: true })) {
          if (animation.timeline && animation.timeline !== document.timeline) continue;
          animation.pause();
          animation.currentTime = local * 1000;
        }
    };
    scroll();
    const observer = new ResizeObserver(scroll);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    const mutation = new MutationObserver(scroll);
    mutation.observe(el, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, [local, shot]);
  return (
    <div
      data-shot-time={local}
      data-directed-playing={playing}
      style={{ position: "absolute", inset: 0 }}
    >
      <style>{`[data-design-board="docs"] .dk-root, [data-design-board="console"] .cn-root { height: 100% !important; }`}</style>
      <div
        ref={scroller}
        data-ds-scroller=""
        data-design-board={shot.board}
        data-shot-scroll={scrollFraction}
        style={{
          position: "absolute",
          top: 80,
          bottom: 140,
          left: 0,
          right: 0,
          transform: "translateZ(0)",
          overflow: "hidden",
          scrollTimeline: "--ds-page block",
          background: "var(--surface-0)",
        }}
      >
        <div
          key={shot.board}
          style={{ height: shot.board === "docs" || shot.board === "console" ? "100%" : undefined }}
        >
          <Suspense fallback={<div data-capture-pending="">Loading board…</div>}>
            <Active />
          </Suspense>
        </div>
      </div>
      <aside
        data-film-chapter={chapter.id}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 80,
          padding: "14px 44px",
          background: "#0c0d14",
          color: "#e1dafb",
          font: "18px var(--font-mono)",
          zIndex: 10000,
        }}
      >
        <div>
          {shot.overlay} · {chapter.title}
        </div>
        <div style={{ marginTop: 6, fontSize: 15, color: "#b6b5c4" }}>{chapter.statusNote}</div>
      </aside>
    </div>
  );
}

function Narration() {
  const { clock: time, playing } = useTimeline();
  const previous = useRef(0);
  const spoken = useRef(new Set<number>());
  useEffect(() => {
    const unprime = primeNeural(SCRIPT);
    return () => {
      unprime();
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    const before = previous.current;
    previous.current = time;
    const past = resolveNarrationSeek(before, time, SCRIPT, (line) => line.t);
    if (past) {
      stopSpeech();
      spoken.current = past;
      return;
    }
    if (!playing) return;
    for (const line of SCRIPT)
      if (before < line.t && time >= line.t && !spoken.current.has(line.t)) {
        spoken.current.add(line.t);
        speak(line.who, line.text);
      }
  }, [time, playing]);
  useEffect(() => setSpeechPlaying(playing), [playing]);
  const line = SCRIPT.find((cue) => time >= cue.t && time < cue.t + cue.dur);
  return line ? (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        left: 160,
        right: 160,
        bottom: 24,
        zIndex: 10000,
        padding: "18px 30px",
        borderRadius: 16,
        background: "#080a12ee",
        color: "#f6f4ef",
        font: "30px var(--font-sans)",
        textAlign: "center",
      }}
    >
      {line.text}
    </div>
  ) : null;
}

function ExploreControl({ onExplore }: { onExplore: () => void }) {
  const { chrome, capture } = useTimeline();
  return !capture && chrome
    ? createPortal(
        <button
          type="button"
          onClick={onExplore}
          style={{
            position: "absolute",
            left: 14,
            top: 110,
            zIndex: 9999,
            padding: "10px 14px",
            borderRadius: 20,
            background: "#14141c",
            color: "#fff",
          }}
        >
          Explore boards
        </button>,
        chrome,
      )
    : null;
}

export function DesignWalkthrough() {
  const [explore, setExplore] = useState(false);
  const voice = useVoiceGate();
  if (explore && !isCapture())
    return (
      <>
        <DesignHub />
        <button
          type="button"
          onClick={() => setExplore(false)}
          style={{
            position: "absolute",
            top: 110,
            left: 14,
            zIndex: 10000,
            background: "#14141c",
            color: "white",
            padding: 12,
          }}
        >
          Back to walkthrough
        </button>
      </>
    );
  return (
    <Stage duration={filmRecord("design").duration} persistKey="mlai-design" voice={voice}>
      <Shot />
      <Narration />
      <VoiceToggle />
      <Transcript lines={SCRIPT} />
      <ExploreControl onExplore={() => setExplore(true)} />
    </Stage>
  );
}
