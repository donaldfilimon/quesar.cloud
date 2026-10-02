import { describe, expect, it, vi } from "vitest";
import {
  AudioEngine,
  type AudioBufferLike,
  type AudioContextLike,
  type AudioParamLike,
  type SpeakOptions,
  type TTSAudio,
  type TTSHandle,
} from "./audio";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function param(): AudioParamLike {
  return {
    value: 0,
    cancelScheduledValues: () => {},
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
  };
}

function source() {
  return {
    buffer: null as AudioBufferLike | null,
    onended: null as (() => void) | null,
    connect: () => {},
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function fixture(generate: TTSHandle["generate"]) {
  const sources: ReturnType<typeof source>[] = [];
  const context: AudioContextLike = {
    state: "running",
    currentTime: 0,
    destination: { connect: () => {} },
    resume: async () => {},
    suspend: async () => {},
    close: vi.fn(async () => {}),
    createGain: () => ({ connect: () => {}, gain: param() }),
    createDynamicsCompressor: () => ({
      connect: () => {},
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param(),
    }),
    createBiquadFilter: () => ({
      connect: () => {},
      type: "peaking",
      frequency: param(),
      Q: param(),
      gain: param(),
    }),
    createBuffer: (_channels, length, sampleRate) => {
      const data = new Float32Array(length);
      return { duration: length / sampleRate, getChannelData: () => data };
    },
    createBufferSource: () => {
      const next = source();
      sources.push(next);
      return next;
    },
  };
  const engine = new AudioEngine({
    registry: {
      speakers: { abbey: { voice: "test", speed: 1, gap: 0, gain: 1, eq: [] } },
      defaultSpeaker: "abbey",
      fallbackVoice: "test",
    },
    loadTTS: async () => ({ tts: { generate }, device: "test" }),
    createAudioContext: () => context,
    prefersReducedMotion: () => false,
    scheduler: {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      idle: (fn) => {
        const handle = setTimeout(fn, 0);
        return () => clearTimeout(handle);
      },
    },
  });
  return { engine, sources, context };
}

const audio: TTSAudio = { audio: new Float32Array(100), sampling_rate: 100 };

describe("AudioEngine playback intent cancellation", () => {
  it.each<SpeakOptions>([{}, { interrupt: false }])(
    "stop cancels pending playback while retaining synthesis for measurement and replay: %j",
    async (options) => {
      const rendering = deferred<TTSAudio>();
      const generate = vi.fn(() => rendering.promise);
      const { engine, sources } = fixture(generate);
      await engine.load();
      const pending = engine.speak("abbey", "Old narration.", options);
      const measurement = engine.measure("abbey", "Old narration.");
      engine.stop();
      rendering.resolve(audio);

      expect(await pending).toBeNull();
      expect(await measurement).toBe(1);
      expect(sources).toHaveLength(0);
      expect(await engine.speak("abbey", "Old narration.")).toBe(1);
      expect(generate).toHaveBeenCalledTimes(1);
      expect(sources).toHaveLength(1);
      expect(sources[0].start).toHaveBeenCalledOnce();
      engine.dispose();
    },
  );

  it("lets a new same-key playback intent share a synthesis cancelled by a seek", async () => {
    const rendering = deferred<TTSAudio>();
    const generate = vi.fn(() => rendering.promise);
    const { engine, sources } = fixture(generate);
    await engine.load();
    const old = engine.speak("abbey", "Shared narration.");
    engine.stop();
    const replay = engine.speak("abbey", "Shared narration.");
    rendering.resolve(audio);

    expect(await old).toBeNull();
    expect(await replay).toBe(1);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(1);
    expect(sources[0].start).toHaveBeenCalledOnce();
    engine.dispose();
  });

  it("keeps the latest interrupting intent when earlier synthesis finishes later", async () => {
    const oldRendering = deferred<TTSAudio>();
    const newRendering = deferred<TTSAudio>();
    const { engine, sources } = fixture((text) =>
      text === "Old narration." ? oldRendering.promise : newRendering.promise,
    );
    await engine.load();
    const old = engine.speak("abbey", "Old narration.");
    const latest = engine.speak("abbey", "New narration.");
    newRendering.resolve(audio);
    expect(await latest).toBe(1);
    oldRendering.resolve(audio);

    expect(await old).toBeNull();
    expect(sources).toHaveLength(1);
    expect(sources[0].start).toHaveBeenCalledOnce();
    expect(sources[0].stop).not.toHaveBeenCalled();
    engine.dispose();
  });

  it("stops the playing source and cancels a replacement still rendering", async () => {
    const rendering = deferred<TTSAudio>();
    const { engine, sources } = fixture(async (text) =>
      text === "Playing narration." ? audio : rendering.promise,
    );
    await engine.load();
    expect(await engine.speak("abbey", "Playing narration.")).toBe(1);
    const replacement = engine.speak("abbey", "Pending narration.");
    engine.stop();
    expect(sources[0].stop).toHaveBeenCalledOnce();
    rendering.resolve(audio);

    expect(await replacement).toBeNull();
    expect(sources).toHaveLength(1);
    engine.dispose();
  });

  it("preserves explicitly non-interrupting playback requests", async () => {
    const rendering = deferred<TTSAudio>();
    const { engine, sources } = fixture(() => rendering.promise);
    await engine.load();
    const first = engine.speak("abbey", "First narration.");
    const second = engine.speak("abbey", "Second narration.", { interrupt: false });
    rendering.resolve(audio);

    expect(await first).toBe(1);
    expect(await second).toBe(1);
    expect(sources).toHaveLength(2);
    expect(sources[0].stop).not.toHaveBeenCalled();
    engine.dispose();
  });

  it("does not resurrect playback after disposal during synthesis", async () => {
    const rendering = deferred<TTSAudio>();
    const { engine, sources, context } = fixture(() => rendering.promise);
    await engine.load();
    const pending = engine.speak("abbey", "Disposed narration.");
    engine.dispose();
    rendering.resolve(audio);

    expect(await pending).toBeNull();
    expect(sources).toHaveLength(0);
    expect(context.close).toHaveBeenCalledOnce();
  });
});
