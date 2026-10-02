import { afterEach, describe, expect, it, vi } from "vitest";
import {
  frameTime,
  loadCaptureFont,
  requiredCaptureFonts,
  sceneRandom,
  trustedCapture,
  settleCapture,
  CAPTURE_READY_TIMEOUT_MS,
} from "./capture";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("capture contract", () => {
  it("requires build opt-in, exact loopback and an explicit request", () => {
    for (const host of ["127.0.0.1", "localhost", "[::1]"])
      expect(trustedCapture(true, `http://${host}:4198/showcase/film?capture=1`)).toBe(true);
    for (const url of [
      "https://quesar.cloud/?capture=1",
      "http://localhost.evil/?capture=1",
      "http://127.0.0.2/?capture=1",
      "http://localhost/",
      "file://localhost/?capture=1",
    ])
      expect(trustedCapture(true, url)).toBe(false);
    expect(trustedCapture(false, "http://localhost/?capture=1")).toBe(false);
  });
  it("uses i/30, excluding the duration endpoint, and rejects invalid frames", () => {
    expect(frameTime(0, 69)).toBe(0);
    expect(frameTime(2069, 69)).toBe(68 + 29 / 30);
    for (const frame of [-1, 2070, 1.5, NaN, Infinity])
      expect(() => frameTime(frame, 69)).toThrow();
  });
  it("recreates scoped random streams independently of earlier shots", () => {
    vi.stubEnv("VITE_FILM_CAPTURE", "1");
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1/?capture=1" } });
    const sequence = (scope: string) => Array.from({ length: 50 }, sceneRandom(scope));
    const expected = sequence("lab");
    sequence("hero");
    sequence("lab");
    expect(sequence("lab")).toEqual(expected);
    expect(sequence("hero")).not.toEqual(expected);
  });
});

describe("bounded capture readiness", () => {
  function setup(phase: "paint" | "fonts" | "image" | "animation") {
    vi.useFakeTimers();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let next = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++next, callback);
      return next;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal("document", {
      fonts: { ready: phase === "fonts" ? pending : Promise.resolve() },
      timeline: {},
    });
    const animation = { timeline: null, pause() {}, ready: pending, currentTime: 0 };
    const root = {
      isConnected: true,
      querySelector: () => null,
      querySelectorAll: (selector: string) =>
        selector === "img" && phase === "image"
          ? [{ complete: false, decode: () => pending, src: "test-image" }]
          : [],
      getAnimations: () => (phase === "animation" ? [animation] : []),
    } as unknown as HTMLElement;
    const drain = async () => {
      for (let i = 0; i < 12; i++) {
        if (phase !== "paint")
          for (const [id, callback] of [...frames]) {
            frames.delete(id);
            callback(0);
          }
        await Promise.resolve();
      }
    };
    return { root, frames, drain, animation, release };
  }
  afterEach(() => vi.useRealTimers());
  for (const phase of ["paint", "fonts", "image", "animation"] as const)
    it(`bounds suspended ${phase} and clears owned callbacks`, async () => {
      const { root, frames, drain } = setup(phase);
      const result = settleCapture(root, 10, new AbortController().signal);
      const rejection = expect(result).rejects.toThrow("timed out during");
      await drain();
      await vi.advanceTimersByTimeAsync(CAPTURE_READY_TIMEOUT_MS);
      await rejection;
      expect(frames.size).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    });
  it("shares one deadline across successive readiness phases", async () => {
    const { root, drain, release } = setup("fonts");
    root.querySelectorAll = ((selector: string) =>
      selector === "img"
        ? [{ complete: false, decode: () => new Promise(() => {}), src: "next-image" }]
        : []) as unknown as HTMLElement["querySelectorAll"];
    const result = settleCapture(root, 10, new AbortController().signal);
    const rejection = expect(result).rejects.toThrow("timed out during image");
    await drain();
    await vi.advanceTimersByTimeAsync(15000);
    release();
    await drain();
    await vi.advanceTimersByTimeAsync(15000);
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("aborts a suspended wait immediately and detaches the lifetime listener", async () => {
    const { root, frames, drain } = setup("fonts");
    const lifetime = new AbortController();
    const removed = vi.spyOn(lifetime.signal, "removeEventListener");
    const result = settleCapture(root, 10, lifetime.signal);
    const rejection = expect(result).rejects.toThrow("unmounted during fonts");
    await drain();
    lifetime.abort();
    await rejection;
    expect(removed).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("required capture fonts", () => {
  const required = {
    family: "Space Grotesk Variable",
    font: 'normal 700 16px "Space Grotesk Variable"',
    text: "WDBX Runtime",
  };
  const face = (status: FontFaceLoadStatus, unicodeRange = "U+0000-00FF") =>
    ({ family: required.family, status, unicodeRange }) as FontFace;
  function fontSet(declared: FontFace[], loaded: FontFace[], check = true) {
    const fonts = new Set(declared);
    return Object.assign(fonts, {
      load: vi.fn(async () => loaded),
      check: vi.fn(() => check),
    }) as unknown as FontFaceSet;
  }
  it("loads only requested text/style and permits unused failed subsets", async () => {
    const latin = face("loaded"),
      unused = face("error", "U+0100-024F");
    const fonts = fontSet([latin, unused], [latin]);
    await loadCaptureFont(required, fonts);
    expect(fonts.load).toHaveBeenCalledWith(required.font, required.text);
  });
  it("rejects failed used faces even when the font set has settled", async () => {
    const fonts = fontSet([face("error")], []);
    vi.mocked(fonts.load).mockRejectedValue(new Error("Network failure"));
    await expect(loadCaptureFont(required, fonts)).rejects.toThrow("Required capture font failed");
  });
  it("rejects missing declarations and unavailable required glyph loads", async () => {
    await expect(loadCaptureFont(required, fontSet([], []))).rejects.toThrow("not declared");
    await expect(loadCaptureFont(required, fontSet([face("unloaded")], []))).rejects.toThrow(
      "unavailable",
    );
    await expect(
      loadCaptureFont(required, fontSet([face("error")], [face("error")])),
    ).rejects.toThrow("unavailable");
    await expect(
      loadCaptureFont(required, fontSet([face("loaded")], [face("loaded")], false)),
    ).rejects.toThrow("unavailable");
  });
  it("allows intentional system glyph fallback outside declared Unicode ranges", async () => {
    await loadCaptureFont({ ...required, text: "→" }, fontSet([face("unloaded", "U+00??")], []));
    await expect(
      loadCaptureFont({ ...required, text: "A" }, fontSet([face("unloaded", "U+00??")], [])),
    ).rejects.toThrow("unavailable");
  });
  it("collects direct text and control values without requiring hidden or overridden parent text", () => {
    class Input {
      value = "value";
      placeholder = "placeholder";
    }
    vi.stubGlobal("HTMLInputElement", Input);
    vi.stubGlobal("HTMLTextAreaElement", class {});
    const style = {
      visibility: "visible",
      fontFamily: '"Space Grotesk Variable", sans-serif',
      fontStyle: "normal",
      fontWeight: "700",
    };
    const element = (text: string, overrides = {}) => ({
      childNodes: [{ nodeType: 3, textContent: text }],
      getClientRects: () => [1],
      style,
      ...overrides,
    });
    const elements = [
      element("Title"),
      element("", { childNodes: [{ nodeType: 1, textContent: "child uses its own font" }] }),
      element("hidden", { style: { ...style, visibility: "hidden" } }),
      element("not laid out", { getClientRects: () => [] }),
      element("system", { style: { ...style, fontFamily: "system-ui" } }),
      Object.assign(new Input(), element("")),
    ];
    vi.stubGlobal("getComputedStyle", (node: { style: unknown }) => node.style);
    const root = { querySelectorAll: () => elements } as unknown as HTMLElement;
    expect(requiredCaptureFonts(root)).toEqual([
      { ...required, text: [...new Set("Titlevalue")].join("") },
    ]);
  });
});
