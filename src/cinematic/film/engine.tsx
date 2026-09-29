// engine.tsx — timeline engine (ported from animations.jsx). Imports easing.
// Exports: Stage, Sprite, PlaybackBar, TextSprite, RectSprite (hooks live in
// timeline-context.ts). Depended on by main.tsx + every scene.

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import { advance, frameDelta } from "@/lib/trailer-engine";
import { clamp } from "./easing";
import {
  TimelineContext,
  SpriteContext,
  useTimeline,
  type TimelineValue,
  type SpriteValue,
} from "./timeline-context";
import { REDUCED_MOTION_QUERY, prefersReducedMotion, resolveSeek } from "./engine-utils";
import type { VoiceGate } from "./speech";

/** Live `prefers-reduced-motion`, so an OS change applies without a remount. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ── sprite ───────────────────────────────────────────────────── */
// Timeline/sprite contexts and hooks live in timeline-context.ts; pure helpers
// in engine-utils.ts.

export function Sprite({
  start = 0,
  end = Infinity,
  children,
  keepMounted = false,
}: {
  start?: number;
  end?: number;
  keepMounted?: boolean;
  children: ReactNode | ((v: SpriteValue) => ReactNode);
}) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;
  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration) ? clamp(localTime / duration, 0, 1) : 0;
  const value: SpriteValue = { localTime, progress, duration, visible };
  return (
    <SpriteContext.Provider value={value}>
      {typeof children === "function" ? children(value) : children}
    </SpriteContext.Provider>
  );
}

/* ── stage ────────────────────────────────────────────────────── */

export function Stage({
  width = 1920,
  height = 1080,
  duration = 10,
  background = "#040406",
  loop = true,
  autoplay = true,
  persistKey = "animstage",
  voice,
  children,
}: {
  width?: number;
  height?: number;
  duration?: number;
  background?: string;
  loop?: boolean;
  autoplay?: boolean;
  persistKey?: string;
  /** A narrated film's voice gate (useVoiceGate). Without one, playback never waits. */
  voice?: VoiceGate;
  children: ReactNode;
}) {
  const ready = voice?.ready ?? true;
  const reducedMotion = useReducedMotion();
  const [time, setTime] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ":t") || "0");
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch {
      return 0;
    }
  });
  // Autoplay only when nothing needs a decision first: under reduced motion,
  // or before a narrated film's voice is loaded, the viewer presses Play.
  const [playing, setPlaying] = useState(
    () => autoplay && !prefersReducedMotion() && (voice?.ready ?? true),
  );
  const [started, setStarted] = useState(playing);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [chrome, setChrome] = useState<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageRefCb = useCallback((el: HTMLDivElement | null) => {
    stageRef.current = el;
    setChrome(el);
  }, []);
  const rafRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  // Latest playhead for the key handler and the unmount flush, synced after
  // each commit (not during render).
  const timeRef = useRef(time);
  useLayoutEffect(() => {
    timeRef.current = time;
  }, [time]);
  const lastSaveRef = useRef(0);

  // Persist the playhead, but throttled — the clock ticks ~60Hz and writing to
  // localStorage every frame is needless main-thread work. Save at most ~1/s and
  // flush the final position when the Stage unmounts (e.g. navigating away).
  useEffect(() => {
    const now = performance.now();
    if (now - lastSaveRef.current >= 1000) {
      lastSaveRef.current = now;
      try {
        localStorage.setItem(persistKey + ":t", String(time));
      } catch {
        /* ignore */
      }
    }
  }, [time, persistKey]);
  useEffect(
    () => () => {
      try {
        localStorage.setItem(persistKey + ":t", String(timeRef.current));
      } catch {
        /* ignore */
      }
    },
    [persistKey],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const barH = 60;
      setScale(Math.max(0.05, Math.min(el.clientWidth / width, (el.clientHeight - barH) / height)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [width, height]);

  useEffect(() => {
    // Hold the clock until the voice is ready, so no line is crossed before the
    // model can speak it (autoplay stays armed; it simply doesn't advance yet).
    if (!playing || !ready) {
      lastTsRef.current = null;
      return;
    }
    const stepFrame = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      // frameDelta clamps the step — see MAX_FRAME_DT in easing.ts for why a
      // backgrounded tab would otherwise jump the playhead by the time away.
      const dt = frameDelta(ts, lastTsRef.current);
      lastTsRef.current = ts;
      setTime((t) => {
        const r = advance(t, dt, duration, loop);
        if (r.time >= duration && loop) return 0;
        if (r.ended) setPlaying(false);
        return r.time;
      });
      rafRef.current = requestAnimationFrame(stepFrame);
    };
    rafRef.current = requestAnimationFrame(stepFrame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, ready, duration, loop]);

  // Pause when the tab goes away. rAF stops in a background tab but the
  // AudioContext does not, so without this the narration keeps advancing
  // against a frozen picture and returns out of sync. `playing` is the single
  // lever — narration.tsx mirrors it to NeuralVoice — so clearing it pauses
  // clock and voice together. Deliberately does NOT auto-resume: audio should
  // not restart at a tab nobody is looking at.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Play is the one place the voice is requested: nothing downloads until the
  // viewer chooses to watch. Until it is ready the clock holds (above).
  const requestVoice = voice?.request;
  const play = useCallback(() => {
    if (!ready) requestVoice?.();
    setStarted(true);
    setPlaying(true);
  }, [ready, requestVoice]);
  const skipVoice = voice?.skip;
  const playWithoutVoice = useCallback(() => {
    skipVoice?.();
    setStarted(true);
    setPlaying(true);
  }, [skipVoice]);
  const togglePlay = useCallback(() => {
    if (playing) setPlaying(false);
    else play();
  }, [playing, play]);

  const seekTo = useCallback(
    (t: number) => {
      const r = resolveSeek(t, duration);
      setHoverTime(null);
      setTime(r.time);
      if (r.atEnd) setPlaying(false);
    },
    [duration],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      // A focused control owns Space (activates it natively); toggling playback
      // too would make "Return to start", the voice toggle or the transcript's
      // <summary> also play/pause, and before the first Play start the voice
      // download.
      if (e.code === "Space" && target?.closest("button, [role=button], summary, a, select"))
        return;
      // Clear any scrubber-hover preview so keyboard control isn't frozen at the
      // hovered frame when the pointer is resting on the track (mouseleave never fires).
      if (e.code === "Space") {
        e.preventDefault();
        setHoverTime(null);
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        setHoverTime(null);
        setTime((t) => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === "ArrowRight") {
        seekTo(timeRef.current + (e.shiftKey ? 1 : 0.1));
      } else if (e.key === "0" || e.code === "Home") {
        setHoverTime(null);
        setTime(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration, seekTo, togglePlay]);

  const displayTime = hoverTime != null ? hoverTime : time;
  const ctxValue = useMemo<TimelineValue>(
    () => ({
      time: displayTime,
      clock: time,
      duration,
      playing,
      setTime,
      setPlaying,
      chrome,
      reducedMotion,
      scale,
    }),
    [displayTime, time, duration, playing, chrome, reducedMotion, scale],
  );

  return (
    <div
      ref={stageRefCb}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#0a0a0a",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width,
            height,
            background,
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "center",
            flexShrink: 0,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <TimelineContext.Provider value={ctxValue}>{children}</TimelineContext.Provider>
        </div>
      </div>
      <PlaybackBar
        time={displayTime}
        duration={duration}
        playing={playing}
        onPlayPause={togglePlay}
        onReset={() => setTime(0)}
        onSeek={seekTo}
        onHover={(t) => setHoverTime(t)}
      />
      {!started ? (
        <StageOverlay>
          <p style={{ fontSize: 20, fontFamily: "var(--font-display)", color: "#f6f4ef" }}>
            {voice && !ready ? "Narrated film" : "Film"}
          </p>
          {reducedMotion ? (
            <p style={overlayNote}>
              Your system asks for reduced motion, so camera shake and flashes are off.
            </p>
          ) : null}
          {voice && !ready ? (
            <p style={overlayNote}>
              The voice is a neural model that downloads when you press play. Captions run either
              way.
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <OverlayButton primary onClick={play}>
              Play
            </OverlayButton>
            {voice && !ready ? (
              <OverlayButton onClick={playWithoutVoice}>Play without voice</OverlayButton>
            ) : null}
          </div>
        </StageOverlay>
      ) : !ready ? (
        <StageOverlay>
          <div role="status" style={{ display: "grid", gap: 10, justifyItems: "center" }}>
            <p style={{ fontSize: 15, color: "#f6f4ef" }}>Preparing the voice</p>
            <div
              aria-hidden="true"
              style={{
                width: 220,
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.12)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(clamp(voice?.progress ?? 0, 0, 1) * 100)}%`,
                  height: "100%",
                  background: "oklch(72% 0.12 250)",
                }}
              />
            </div>
            <p style={overlayNote}>
              {Math.round(clamp(voice?.progress ?? 0, 0, 1) * 100)}% downloaded
            </p>
          </div>
          <OverlayButton onClick={playWithoutVoice}>Play without voice</OverlayButton>
        </StageOverlay>
      ) : null}
    </div>
  );
}

/* ── overlays ─────────────────────────────────────────────────── */

const overlayNote: CSSProperties = {
  maxWidth: 420,
  fontSize: 13,
  lineHeight: 1.5,
  color: "rgba(220,220,228,0.8)",
  textAlign: "center",
};

function StageOverlay({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(4,4,6,0.72)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <style>{`.mlai-overlay-button:focus-visible{outline:2px solid #7cb0ff;outline-offset:2px}`}</style>
      {children}
    </div>
  );
}

function OverlayButton({
  children,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mlai-overlay-button"
      style={{
        minHeight: 44,
        padding: "0 20px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.2)",
        background: primary ? "#f6f4ef" : "rgba(255,255,255,0.06)",
        color: primary ? "#0a0a0a" : "#f6f4ef",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ── playback bar ─────────────────────────────────────────────── */

function PlaybackBar({
  time,
  duration,
  playing,
  onPlayPause,
  onReset,
  onSeek,
  onHover,
}: {
  time: number;
  duration: number;
  playing: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onSeek: (t: number) => void;
  onHover: (t: number | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const timeFromEvent = useCallback(
    (e: { clientX: number }) => {
      const rect = trackRef.current!.getBoundingClientRect();
      return clamp((e.clientX - rect.left) / rect.width, 0, 1) * duration;
    },
    [duration],
  );

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t: number) => {
    const total = Math.max(0, t),
      m = Math.floor(total / 60),
      s = Math.floor(total % 60),
      cs = Math.floor((total * 100) % 100);
    return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };
  const mono = "var(--font-mono)";

  return (
    <div
      className="mlai-transport"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: "rgba(20,20,20,0.92)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        width: "100%",
        maxWidth: 680,
        alignSelf: "center",
        borderRadius: 8,
        color: "#f6f4ef",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* Inline styles cannot express :focus-visible, so the transport's keyboard
          focus ring lives here, scoped to this bar. Pointer clicks show nothing. */}
      <style>{`.mlai-transport button:focus-visible,.mlai-transport [role="slider"]:focus-visible{outline:2px solid #7cb0ff;outline-offset:2px;border-radius:6px}`}</style>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 2v10M12 2L5 7l7 5V2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title={playing ? "Pause (space)" : "Play (space)"}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor" />
            <rect x="8" y="2" width="3" height="10" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor" />
          </svg>
        )}
      </IconButton>
      <div
        style={{
          fontFamily: mono,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          width: 64,
          textAlign: "right",
        }}
      >
        {fmt(time)}
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Playhead"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={fmt(time)}
        onKeyDown={(e) => {
          // The window handler already scrubs on arrows; this makes the track a
          // real slider for assistive tech, with Home/End as well.
          if (e.key === "Home") {
            e.preventDefault();
            onSeek(0);
          } else if (e.key === "End") {
            e.preventDefault();
            onSeek(duration);
          }
        }}
        // Pointer events cover mouse, touch and pen; capture keeps the drag on
        // the track when the finger or cursor leaves it.
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          onSeek(timeFromEvent(e));
          onHover(null);
        }}
        onPointerMove={(e) => {
          if (dragging) onSeek(timeFromEvent(e));
          else if (e.pointerType === "mouse") onHover(timeFromEvent(e));
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onPointerLeave={() => {
          if (!dragging) onHover(null);
        }}
        style={{
          flex: 1,
          height: 44,
          touchAction: "none",
          position: "relative",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 4,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${pct}%`,
            height: 4,
            background: "oklch(72% 0.12 250)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: "50%",
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            background: "#fff",
            borderRadius: 6,
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          width: 64,
          textAlign: "left",
          color: "rgba(246,244,239,0.55)",
        }}
      >
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 44,
        height: 44,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: hover ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        color: "#f6f4ef",
        cursor: "pointer",
        padding: 0,
        transition: "background 120ms",
      }}
    >
      {children}
    </button>
  );
}
