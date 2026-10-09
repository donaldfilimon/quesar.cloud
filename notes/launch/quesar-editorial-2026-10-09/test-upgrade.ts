// Browser geometry, deterministic motion, and actual OfflineAudioContext evidence.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
const base = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(base, "../../..");
const server = await createServer({
  configFile: false,
  root: base,
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
  logLevel: "error",
});
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(server.resolvedUrls!.local[0]);
  await page.waitForFunction(() => window.ready);
  await page.evaluate(() => document.fonts.ready);
  const checks = await page.evaluate(() => {
    const results = [];
    for (const duration of [60, 120, 180, 600])
      for (const edition of ["architecture", "studio"])
        for (let i = 0; i < window.selections[duration].length; i++) {
          window.renderFrame(
            ((i + 0.5) * duration) / window.selections[duration].length,
            duration,
            edition,
          );
          const elements = ["h1", ".body-copy", ".reference", ".illustrative", "footer"];
          const bad = elements.flatMap((selector) => {
            const node = document.querySelector(selector)!,
              r = node.getBoundingClientRect();
            return r.width &&
              (r.right > 1875 || r.bottom > (selector === "footer" ? 1065 : 940) || r.left < 45)
              ? [{ selector, rect: r.toJSON() }]
              : [];
          });
          results.push({ duration, edition, chapter: window.selections[duration][i], bad });
        }
    window.renderFrame(3, 60, "architecture");
    const first = document.querySelector(".shot")!.getAttribute("style");
    window.renderFrame(4, 60, "architecture");
    const second = document.querySelector(".shot")!.getAttribute("style");
    window.renderFrame(3, 60, "architecture");
    if (first === second || first !== document.querySelector(".shot")!.getAttribute("style"))
      throw Error("Non-deterministic or absent camera motion");
    return results;
  });
  const failed = checks.filter((c) => c.bad.length);
  if (failed.length) throw Error(JSON.stringify(failed));
  const offline = await page.evaluate(async (url) => {
    const { AudioEngine } = await import(url);
    const sr = 24000,
      input = new Float32Array(sr);
    for (let i = 0; i < sr; i++) input[i] = 0.35 * Math.sin((i * 2 * Math.PI * 220) / sr);
    const make = (eq: { type: BiquadFilterType; freq: number; gain?: number; q?: number }[]) =>
      new AudioEngine({
        registry: {
          speakers: { abbey: { voice: "fixture", speed: 1, gap: 0.2, gain: 1, eq } },
          defaultSpeaker: "abbey",
          fallbackVoice: "fixture",
        },
        loadTTS: async () => ({
          tts: { generate: async () => ({ audio: input, sampling_rate: sr }) },
          device: "fixture",
        }),
        createAudioContext: () => {
          throw Error("Live audio context created during export");
        },
        prefersReducedMotion: () => false,
        scheduler: {
          setTimeout,
          clearTimeout,
          idle: (fn: () => void) => {
            const id = setTimeout(fn, 0);
            return () => clearTimeout(id);
          },
        },
      });
    const flat = make([]),
      shaped = make([
        { type: "lowshelf", freq: 220, gain: 2 },
        { type: "peaking", freq: 2400, q: 0.9, gain: 1 },
        { type: "highshelf", freq: 7000, gain: -1.5 },
      ]);
    const options = {
      maxSeconds: 2,
      createOfflineContext: (n: number, sr: number) => new OfflineAudioContext(1, n, sr),
    };
    const a = await flat.exportPCM("abbey", "Offline graph test.", options),
      b = await shaped.exportPCM("abbey", "Offline graph test.", options);
    let difference = 0;
    for (let i = 0; i < sr; i++) difference += Math.abs(a.samples[i] - b.samples[i]);
    flat.dispose();
    shaped.dispose();
    if (
      a.samples.length !== sr + 960 ||
      b.samples.length !== sr + 960 ||
      difference < 0.1 ||
      b.samples.some((v: number) => !Number.isFinite(v))
    )
      throw Error("Offline graph did not process EQ deterministically");
    return {
      frames: b.samples.length,
      sampleRate: sr,
      absoluteEQDifference: difference,
      peak: b.processing.peak,
      liveContextCreated: false,
    };
  }, `/@fs/${root}/src/lib/trailer-engine/audio.ts`);
  console.log(
    JSON.stringify({ geometryChecks: checks.length, deterministicMotion: true, offline }, null, 2),
  );
} finally {
  await browser.close();
  await server.close();
}
