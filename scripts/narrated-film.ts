// Local export CLI: node scripts/narrated-film.ts <loopback-origin> <film> <output-directory>
import { chromium } from "@playwright/test";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, stat, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { filmCollection, type FilmRecord } from "../src/lib/mlai/categories/film-collection.ts";
import { PERSONAS } from "../src/cinematic/film/tokens.ts";
import { pronounce } from "../src/cinematic/film/pronunciation.ts";
import { captureURL, openFilmRenderer, streamFilmFrames } from "./export-films.ts";

const RATE = 24000;
const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const CDN = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
interface TTS {
  generate(
    text: string,
    options: { voice: string; speed: number },
  ): Promise<{ audio: Float32Array; sampling_rate: number }>;
}
type VoiceWindow = Window & { __exportTTS?: TTS };
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

export function placeCue(
  track: Float32Array,
  samples: readonly number[],
  start: number,
  end: number,
  rate = RATE,
) {
  if (!samples.length || samples.length > Math.round((end - start) * rate))
    throw new Error(`Narration overrun: ${samples.length / rate}s exceeds ${end - start}s`);
  const offset = Math.round(start * rate);
  if (offset < 0 || offset + samples.length > track.length) throw new Error("Cue outside film");
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) throw new Error("Nonfinite narration sample");
    // Ten-millisecond edge fades, fixed headroom; never truncate a cue.
    const fade = Math.min(1, i / (rate * 0.01), (samples.length - 1 - i) / (rate * 0.01));
    const value = track[offset + i] + samples[i] * 0.85 * fade;
    if (Math.abs(value) > 1) throw new Error("Narration clipping");
    track[offset + i] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  return { seconds: samples.length / rate, samples: samples.length, peak };
}

function timestamp(seconds: number) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
}
export function captions(film: FilmRecord) {
  return (
    "WEBVTT\n\n" +
    film.cues
      .map((cue) => `${cue.id}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`)
      .join("\n")
  );
}

/** Reserve 12 MiB for encoder variability/container overhead below the 100 MiB
 * delivery limit. Long films need a lower ceiling than the short-room exports. */
export function encodingLimits(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid film duration");
  const videoBitrate = Math.min(6000000, Math.floor((88 * 1024 * 1024 * 8) / duration) - 128000);
  if (videoBitrate < 128000) throw new Error("Film too long for the delivery budget");
  return {
    videoBitrate,
    bufferSize: videoBitrate * 2,
    // The controlled browser has several readiness paints per frame. The old
    // 400ms budget killed valid long renders on a shared machine.
    deadlineMs: 120000 + Math.ceil(duration * 30) * 1000,
  };
}

export async function exportNarratedFilm(origin: string, id: string, output: string) {
  captureURL(origin, id);
  const film = filmCollection.find((film) => film.id === id);
  if (!film) throw new Error("Unknown film");
  await mkdir(output, { recursive: true });
  const scratch = path.join(output, `.${id}-${crypto.randomUUID()}`);
  await mkdir(scratch);
  const browser = await chromium.launch({ headless: true });
  const synthesisDeadline = setTimeout(
    () => {
      void browser.close();
    },
    10 * 60 * 1000,
  );
  const track = new Float32Array(Math.ceil(film.duration * RATE));
  const measurements = [];
  try {
    const page = await browser.newPage();
    await page.goto(captureURL(origin, id).href);
    page.setDefaultTimeout(600000);
    await page.evaluate(
      async ({ cdn, model }) => {
        const module = (await import(/* @vite-ignore */ cdn)) as {
          KokoroTTS: {
            from_pretrained(
              model: string,
              options: { dtype: string; device: string },
            ): Promise<TTS>;
          };
        };
        (window as VoiceWindow).__exportTTS = await module.KokoroTTS.from_pretrained(model, {
          dtype: "q8",
          device: "wasm",
        });
      },
      { cdn: CDN, model: MODEL },
    );
    for (const cue of film.cues) {
      const persona = PERSONAS[cue.narrator];
      const spoken = pronounce(cue.text);
      const audio = await page.evaluate(
        async ({ text, voice, speed }) => {
          const audio = await (window as VoiceWindow).__exportTTS!.generate(text, { voice, speed });
          return { samples: Array.from(audio.audio), rate: audio.sampling_rate };
        },
        { text: spoken, voice: persona.voice, speed: persona.prosody.speed },
      );
      if (audio.rate !== RATE) throw new Error(`Unexpected sample rate ${audio.rate}`);
      const overrun = audio.samples.length > Math.round((cue.end - cue.start) * RATE);
      const measured = overrun
        ? { seconds: audio.samples.length / RATE, samples: audio.samples.length, peak: null }
        : placeCue(track, audio.samples, cue.start, cue.end);
      measurements.push({
        ...cue,
        voice: persona.voice,
        speed: persona.prosody.speed,
        textHash: hash(cue.text),
        spokenHash: hash(spoken),
        ...measured,
        overrun,
      });
      console.log(
        `${id}/${cue.id}: ${measured.seconds.toFixed(3)}s / ${(cue.end - cue.start).toFixed(3)}s`,
      );
    }
    await writeFile(path.join(scratch, "narration.f32"), Buffer.from(track.buffer));
    await writeFile(
      path.join(output, `${id}.timing.json`),
      JSON.stringify(
        {
          model: MODEL,
          cdn: CDN,
          dtype: "q8",
          device: "wasm",
          rate: RATE,
          catalogHash: hash(JSON.stringify(film)),
          measurements,
        },
        null,
        2,
      ),
    );
    if (measurements.some((cue) => cue.overrun))
      throw new Error("Measured narration overruns; see timing receipt. No video encoded.");
  } finally {
    clearTimeout(synthesisDeadline);
    await browser.close();
  }

  const renderer = await openFilmRenderer(origin, id);
  const limits = encodingLimits(film.duration);
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "image2pipe",
    "-framerate",
    "30",
    "-i",
    "pipe:0",
    "-f",
    "f32le",
    "-ar",
    String(RATE),
    "-ac",
    "1",
    "-i",
    path.join(scratch, "narration.f32"),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-threads",
    "2",
    "-crf",
    "22",
    "-maxrate",
    String(limits.videoBitrate),
    "-bufsize",
    String(limits.bufferSize),
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    path.join(scratch, "film.mp4"),
  ];
  const encoder = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "inherit"] });
  const encodingDeadline = setTimeout(() => {
    encoder.kill("SIGTERM");
    void renderer.close();
  }, limits.deadlineMs);
  const exited = new Promise<void>((resolve, reject) => {
    encoder.once("error", reject);
    encoder.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`)),
    );
  });
  void exited.catch(() => {});
  try {
    if (renderer.duration !== film.duration) throw new Error("Capture/catalog duration mismatch");
    // Opening frames deliberately fade in from black. Capture the first
    // chapter midpoint so the exported poster actually identifies the film.
    const opening = film.chapters[0];
    const posterFrame = Math.floor(((opening.start + opening.end) / 2) * 30);
    await writeFile(path.join(scratch, "poster.png"), (await renderer.render(posterFrame)).png);
    await streamFilmFrames(renderer, encoder.stdin, (receipt) => {
      if (receipt.frame % 300 === 0)
        console.log(`${id}: frame ${receipt.frame}/${renderer.frameCount}`);
    });
    await exited;
    const size = (await stat(path.join(scratch, "film.mp4"))).size;
    if (size >= 100 * 1024 * 1024) throw new Error("Export exceeds GitHub file limit");
    await writeFile(path.join(output, `${id}.vtt`), captions(film));
    await writeFile(
      path.join(output, `${id}.transcript.txt`),
      film.cues.map((cue) => cue.text).join("\n\n") + "\n",
    );
    await writeFile(
      path.join(output, `${id}.chapters.json`),
      JSON.stringify(film.chapters, null, 2),
    );
    await writeFile(
      path.join(output, `${id}.encoding.json`),
      JSON.stringify(
        {
          args,
          encoderVersion: (
            await promisify(execFile)("ffmpeg", ["-version"], { timeout: 10000 })
          ).stdout.split("\n")[0],
          captureOrigin: new URL(origin).origin,
          catalogHash: hash(JSON.stringify(film)),
          modelRevision:
            "unresolved; model ID and dtype recorded, not an immutable weight revision",
          seed: renderer.seed,
          frameCount: renderer.frameCount,
          posterFrame,
          size,
          status: "encoded; decoded and listening acceptance still required",
        },
        null,
        2,
      ),
    );
    await rename(path.join(scratch, "film.mp4"), path.join(output, `${id}.mp4`));
    await rename(path.join(scratch, "poster.png"), path.join(output, `${id}.poster.png`));
    await rm(scratch, { recursive: true });
  } catch (error) {
    encoder.kill("SIGTERM");
    await exited.catch(() => {});
    throw error;
  } finally {
    clearTimeout(encodingDeadline);
    await renderer.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [origin, film, output] = process.argv.slice(2);
  if (!origin || !film || !output)
    throw new Error(
      "Usage: node scripts/narrated-film.ts <loopback-origin> <film> <output-directory>",
    );
  await exportNarratedFilm(origin, film, path.resolve(output));
}
