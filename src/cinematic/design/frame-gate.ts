// Shared gates for the design boards' animation loops.
//
// Plain functions (not hooks) so each effect keeps its own state: switching
// reduced motion or scrolling away must not re-run the effect and rebuild the
// scene. Call one inside the effect that owns the element and dispose it in
// that effect's cleanup.
//
// A loop runs only while its element intersects the viewport and the document
// is visible. Under `prefers-reduced-motion: reduce` it never loops; the frame
// gate paints one static frame instead, the interval gate simply holds, and
// both follow live changes to the setting.

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

interface Activity {
  /** True when on screen, the tab is visible and motion is allowed. */
  running(): boolean;
  reduced(): boolean;
  dispose(): void;
}

/** Tracks visibility and the motion preference; `onChange` fires on any change. */
function watchActivity(el: Element, onChange: () => void): Activity {
  // Without IntersectionObserver (old engines) treat the element as visible.
  let visible = typeof IntersectionObserver !== "function";
  const mq =
    typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
  let reduce = mq?.matches ?? false;

  const io =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          const last = entries[entries.length - 1];
          if (last) visible = last.isIntersecting;
          onChange();
        })
      : null;
  io?.observe(el);

  const onMotionChange = (): void => {
    reduce = mq?.matches ?? false;
    onChange();
  };
  document.addEventListener("visibilitychange", onChange);
  mq?.addEventListener("change", onMotionChange);

  return {
    running: () => visible && !document.hidden && !reduce,
    reduced: () => reduce,
    dispose() {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onChange);
      mq?.removeEventListener("change", onMotionChange);
    },
  };
}

export interface FrameGate {
  /** Paint a single frame now, whether or not the loop is running. */
  renderOnce(): void;
  dispose(): void;
}

/**
 * Drives `frame` with requestAnimationFrame under the gate above. The owner
 * must attach its own window "resize" listener BEFORE calling this: the gate
 * repaints once after a resize while idle, because resizing clears the canvas.
 */
export function attachFrameGate(el: Element, frame: (now: number) => void): FrameGate {
  let raf = 0;
  const tick = (now: number): void => {
    frame(now);
    raf = requestAnimationFrame(tick);
  };
  const renderOnce = (): void => frame(performance.now());

  let wasReduced = false;
  const sync = (): void => {
    const run = activity.running();
    if (run && !raf) raf = requestAnimationFrame(tick);
    else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    // Entering reduced motion: leave a settled still rather than a mid-motion one.
    const reduced = activity.reduced();
    if (reduced && !wasReduced) renderOnce();
    wasReduced = reduced;
  };
  const activity = watchActivity(el, sync);

  const onResize = (): void => {
    if (!raf) renderOnce();
  };
  window.addEventListener("resize", onResize);

  // Paint the first frame synchronously so the canvas is never blank while the
  // observer reports; the loop (if allowed) takes over from the next frame.
  renderOnce();
  wasReduced = activity.reduced();
  sync();

  return {
    renderOnce,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      activity.dispose();
      window.removeEventListener("resize", onResize);
    },
  };
}

/**
 * Runs `tick` every `ms` under the gate above. Under reduced motion it holds
 * the current values (no ticks) rather than animating them.
 */
export function attachIntervalGate(el: Element, tick: () => void, ms: number): () => void {
  let iv: ReturnType<typeof setInterval> | null = null;
  const sync = (): void => {
    const run = activity.running();
    if (run && iv === null) iv = setInterval(tick, ms);
    else if (!run && iv !== null) {
      clearInterval(iv);
      iv = null;
    }
  };
  const activity = watchActivity(el, sync);
  sync();
  return () => {
    if (iv !== null) clearInterval(iv);
    iv = null;
    activity.dispose();
  };
}
