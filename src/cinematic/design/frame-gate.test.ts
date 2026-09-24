import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  attachFrameGate,
  attachIntervalGate,
  readReducedMotion,
  subscribeReducedMotion,
} from "./frame-gate";

// Minimal DOM stand-ins: vitest runs on Node, so window, document, matchMedia,
// IntersectionObserver and requestAnimationFrame are all faked here.

type Listener = () => void;

function emitter() {
  const map = new Map<string, Set<Listener>>();
  return {
    addEventListener: (type: string, fn: Listener) => {
      let set = map.get(type);
      if (!set) {
        set = new Set();
        map.set(type, set);
      }
      set.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => {
      map.get(type)?.delete(fn);
    },
    emit: (type: string) => map.get(type)?.forEach((fn) => fn()),
    count: (type: string) => map.get(type)?.size ?? 0,
  };
}

interface FakeObserver {
  cb: (entries: { isIntersecting: boolean }[]) => void;
  disconnected: boolean;
}

let mq: ReturnType<typeof emitter> & { matches: boolean };
let doc: ReturnType<typeof emitter> & { hidden: boolean };
let win: ReturnType<typeof emitter> & { matchMedia: () => typeof mq };
let observers: FakeObserver[];
let rafQueue: Map<number, (t: number) => void>;
let rafId: number;

const el = {} as Element;

function setReduced(v: boolean) {
  mq.matches = v;
  mq.emit("change");
}
function setHidden(v: boolean) {
  doc.hidden = v;
  doc.emit("visibilitychange");
}
function setVisible(v: boolean) {
  for (const o of observers) o.cb([{ isIntersecting: v }]);
}
function flushFrame() {
  const pending = [...rafQueue.values()];
  rafQueue.clear();
  for (const fn of pending) fn(performance.now());
}

beforeEach(() => {
  mq = Object.assign(emitter(), { matches: false });
  doc = Object.assign(emitter(), { hidden: false });
  win = Object.assign(emitter(), { matchMedia: () => mq });
  observers = [];
  rafQueue = new Map();
  rafId = 0;
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      entry: FakeObserver;
      constructor(cb: FakeObserver["cb"]) {
        this.entry = { cb, disconnected: false };
        observers.push(this.entry);
      }
      observe() {}
      disconnect() {
        this.entry.disconnected = true;
      }
    },
  );
  vi.stubGlobal("requestAnimationFrame", (fn: (t: number) => void) => {
    rafId += 1;
    rafQueue.set(rafId, fn);
    return rafId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => rafQueue.delete(id));
  // Fake only the interval clock; the rAF stubs above stay in charge of frames.
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("attachIntervalGate", () => {
  it("ticks only while on screen and the tab is visible", () => {
    const tick = vi.fn();
    const dispose = attachIntervalGate(el, tick, 100);
    // Not intersecting until the observer reports.
    vi.advanceTimersByTime(500);
    expect(tick).not.toHaveBeenCalled();

    setVisible(true);
    vi.advanceTimersByTime(300);
    expect(tick).toHaveBeenCalledTimes(3);

    setHidden(true);
    vi.advanceTimersByTime(500);
    expect(tick).toHaveBeenCalledTimes(3);

    setHidden(false);
    setVisible(false);
    vi.advanceTimersByTime(500);
    expect(tick).toHaveBeenCalledTimes(3);

    dispose();
    expect(doc.count("visibilitychange")).toBe(0);
    expect(mq.count("change")).toBe(0);
    expect(observers[0]?.disconnected).toBe(true);
  });

  it("holds under reduced motion and follows live changes", () => {
    mq.matches = true;
    const tick = vi.fn();
    const dispose = attachIntervalGate(el, tick, 100);
    setVisible(true);
    vi.advanceTimersByTime(500);
    expect(tick).not.toHaveBeenCalled();

    setReduced(false);
    vi.advanceTimersByTime(200);
    expect(tick).toHaveBeenCalledTimes(2);

    setReduced(true);
    vi.advanceTimersByTime(500);
    expect(tick).toHaveBeenCalledTimes(2);
    dispose();
  });

  it("with respectReducedMotion false still pauses offscreen and when hidden", () => {
    mq.matches = true;
    const tick = vi.fn();
    const dispose = attachIntervalGate(el, tick, 100, { respectReducedMotion: false });
    setVisible(true);
    vi.advanceTimersByTime(200);
    expect(tick).toHaveBeenCalledTimes(2);

    setHidden(true);
    vi.advanceTimersByTime(500);
    expect(tick).toHaveBeenCalledTimes(2);

    setHidden(false);
    setVisible(false);
    vi.advanceTimersByTime(500);
    expect(tick).toHaveBeenCalledTimes(2);
    dispose();
  });

  it("stops ticking after dispose", () => {
    const tick = vi.fn();
    const dispose = attachIntervalGate(el, tick, 100);
    setVisible(true);
    dispose();
    vi.advanceTimersByTime(500);
    expect(tick).not.toHaveBeenCalled();
  });
});

describe("attachFrameGate", () => {
  it("paints once up front, loops while running and stops when hidden", () => {
    const frame = vi.fn();
    const gate = attachFrameGate(el, frame);
    expect(frame).toHaveBeenCalledTimes(1);
    expect(rafQueue.size).toBe(0);

    setVisible(true);
    flushFrame();
    flushFrame();
    expect(frame).toHaveBeenCalledTimes(3);

    setHidden(true);
    expect(rafQueue.size).toBe(0);
    gate.dispose();
    expect(win.count("resize")).toBe(0);
  });

  it("paints a still frame on entering reduced motion and never loops", () => {
    const frame = vi.fn();
    const gate = attachFrameGate(el, frame);
    setVisible(true);
    frame.mockClear();

    setReduced(true);
    expect(frame).toHaveBeenCalledTimes(1);
    expect(rafQueue.size).toBe(0);

    // An idle resize repaints once, because resizing clears the canvas.
    win.emit("resize");
    expect(frame).toHaveBeenCalledTimes(2);
    gate.dispose();
  });
});

describe("reduced-motion store", () => {
  it("reads and subscribes to the media query", () => {
    expect(readReducedMotion()).toBe(false);
    const onChange = vi.fn();
    const unsubscribe = subscribeReducedMotion(onChange);
    setReduced(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(readReducedMotion()).toBe(true);
    unsubscribe();
    expect(mq.count("change")).toBe(0);
  });

  it("answers false without matchMedia", () => {
    vi.stubGlobal("window", emitter());
    expect(readReducedMotion()).toBe(false);
    expect(() => subscribeReducedMotion(() => {})()).not.toThrow();
  });
});
