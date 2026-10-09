/** Explicit local export: node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --pilot
 * --all: 8 freshly sampled Quesar films + 8 mastered inherited-neural MLAI edits.
 * Outputs are immutable under artifacts/<version>; interrupted jobs are retained.
 */
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import { readFile, writeFile, mkdir, rename, access, copyFile, readdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateCachedPCM } from "./upgrade-cache.mjs";
import { validateAdaptationEdit } from "./upgrade-edit-boundaries.mjs";
import { collectSourceManifest, assertMatchingSourceDigest } from "./upgrade-provenance.mjs";
import { PERSONAS } from "../../../src/cinematic/film/tokens.ts";
import { MODEL_ID } from "../../../src/cinematic/film/kokoro-loader.ts";

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, "../../..");
const sourceEdits = path.resolve(base, "../trailer-editions-2026-10-09/artifacts");
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
const version = option("--version") ?? "abbey-neural-v7";
if (!/^[a-z0-9][a-z0-9-]{0,70}$/.test(version)) throw Error("Invalid version directory");
const output = path.join(base, "artifacts", version);
const selections = {
  60: [0, 10, 14, 29],
  120: [0, 2, 6, 8, 10, 14, 18, 29],
  180: [0, 1, 2, 6, 8, 10, 12, 14, 16, 18, 23, 29],
  600: Array.from({ length: 30 }, (_, i) => i),
};
const mlai = [
  "kinetic-60",
  "editorial-60",
  "technical-120",
  "design-120",
  "technical-180",
  "design-180",
  "technical-600",
  "design-600",
];
const all = [
  ...Object.keys(selections).flatMap((d) =>
    ["architecture", "studio"].map((e) => `quesar-${e}-${d}`),
  ),
  ...mlai.map((n) => `mlai-quesar-${n}`),
];
const ids = args.includes("--all") ? all : [option("--cut") ?? "quesar-architecture-60"];
if (ids.some((id) => !all.includes(id))) throw Error("Unknown cut");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const fileHash = async (f) => sha(await readFile(f));
const exists = async (f) => {
  try {
    await access(f);
    return true;
  } catch {
    return false;
  }
};
const json = async (f) => JSON.parse(await readFile(f, "utf8"));
const save = async (f, data) => writeFile(f, JSON.stringify(data, null, 2) + "\n");
const stamp = (s) => {
  const ms = Math.round(s * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};
const children = new Set();
const run = (cmd, a, timeout = 300000) =>
  new Promise((resolve, reject) => {
    const child = execFile(
      cmd,
      a,
      { timeout, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        children.delete(child);
        if (error) reject(Error(`${cmd}: ${error.message}\n${String(stderr ?? "").slice(-3000)}`));
        else resolve({ stdout, stderr });
      },
    );
    children.add(child);
  });
const ff = async (a, timeout) => run("ffmpeg", ["-hide_banner", "-nostdin", ...a], timeout);
let browser, server, encoder;
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  encoder?.kill("SIGKILL");
  for (const child of children) child.kill("SIGKILL");
  await browser?.close().catch(() => {});
  await server?.close().catch(() => {});
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    void shutdown().finally(() => process.exit(130));
  });
// Explicit seeds cover the browser bootstrap and the nonliteral /@fs voice
// import below; the manifest follows their local imports and assets recursively.
const provenanceInputs = {
  root,
  browserRoot: base,
  entries: [
    path.join(base, "index.html"),
    fileURLToPath(import.meta.url),
    path.join(root, "src/cinematic/film/neural-voice.ts"),
    path.join(root, "bun.lock"),
    path.join(root, "package.json"),
  ],
};
const sourceManifest = await collectSourceManifest(provenanceInputs);
const sources = sourceManifest.sources;
const sourceDigest = sourceManifest.digest;
const chapters = await json(path.join(base, "chapters.json"));

async function inspect(video, duration, requireMasterPeak = true) {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-count_frames",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    video,
  ]);
  const probe = JSON.parse(stdout),
    v = probe.streams.find((s) => s.codec_type === "video"),
    a = probe.streams.find((s) => s.codec_type === "audio");
  if (
    !v ||
    !a ||
    !Number.isFinite(Number(probe.format.duration)) ||
    !Number.isFinite(Number(a.duration)) ||
    v.width !== 1920 ||
    v.height !== 1080 ||
    v.avg_frame_rate !== "30/1" ||
    Number(v.nb_read_frames) !== duration * 30 ||
    Math.abs(Number(probe.format.duration) - duration) > 0.05 ||
    Math.abs(Number(a.duration) - duration) > 0.05
  )
    throw Error("Invalid duration, frames, dimensions or audio");
  await ff(["-v", "error", "-xerror", "-threads", "2", "-i", video, "-f", "null", "-"]);
  const metrics = await ff([
    "-v",
    "info",
    "-threads",
    "2",
    "-i",
    video,
    "-vn",
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
    "-f",
    "null",
    "-",
  ]);
  const match = metrics.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!match) throw Error("Missing loudness measurements");
  const loudness = JSON.parse(match[0]);
  if (
    !Number.isFinite(Number(loudness.input_i)) ||
    (requireMasterPeak && Number(loudness.input_tp) > -1)
  )
    throw Error("Invalid silence/true-peak measurement");
  return { probe, sha256: await fileHash(video), audioMetrics: loudness };
}
async function masterAudio(input, outputFile) {
  const first = await ff([
    "-v",
    "info",
    "-i",
    input,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
    "-f",
    "null",
    "-",
  ]);
  const m = JSON.parse(first.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0] ?? "null");
  if (!m || !Number.isFinite(Number(m.input_i))) throw Error("Cannot master silent narration");
  const filter = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
  await ff([
    "-v",
    "error",
    "-n",
    "-i",
    input,
    "-af",
    filter,
    "-ar",
    "48000",
    "-c:a",
    "pcm_s24le",
    outputFile,
  ]);
  return { firstPass: m, filter, targetLUFS: -16, truePeakTarget: -1.5 };
}
async function phrasePCM(page, text) {
  const cacheRoot = path.join(output, "_pcm-cache");
  await mkdir(cacheRoot, { recursive: true });
  const key = sha(JSON.stringify({ text, persona: "abbey", sourceDigest }));
  const cache = path.join(cacheRoot, key);
  const validate = (bytes, record) =>
    validateCachedPCM(bytes, record, {
      key,
      sourceDigest,
      text,
      model: MODEL_ID,
      voice: PERSONAS.abbey.voice,
      speed: PERSONAS.abbey.prosody.speed,
    });
  if (await exists(cache)) {
    const record = await json(path.join(cache, "receipt.json"));
    return { ...validate(await readFile(path.join(cache, "audio.f32")), record), cached: true };
  }
  if ((await readdir(cacheRoot)).length >= 256)
    throw Error("Bounded neural cache is full; use a new version");
  const result = await page.evaluate(async (text) => {
    const r = await window.exportPersonaPCM("abbey", text, { maxSeconds: 90, timeoutMs: 300000 });
    return { ...r, samples: Array.from(r.samples) };
  }, text);
  const bytes = Buffer.from(Float32Array.from(result.samples).buffer),
    { samples: _, ...receipt } = result;
  const record = {
    key,
    sourceDigest,
    text,
    persona: "abbey",
    receipt,
    pcmSHA256: sha(bytes),
    synthesizedAt: new Date().toISOString(),
  };
  const validated = validate(bytes, record);
  const partial = path.join(cacheRoot, `.partial-${key}-${randomUUID()}`);
  await mkdir(partial);
  await writeFile(path.join(partial, "audio.f32"), bytes);
  await save(path.join(partial, "receipt.json"), record);
  await rename(partial, cache);
  return { ...validated, cached: false };
}
async function openBrowser() {
  if (browser) return;
  server = await createServer({
    configFile: false,
    root: base,
    resolve: { alias: { "@": path.join(root, "src") } },
    server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
    logLevel: "warn",
  });
  await server.listen();
  browser = await chromium.launch({ headless: true });
}
async function quesar(id, dir, duration) {
  await openBrowser();
  const edition = id.split("-")[1],
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // A stalled page/model or encoder cannot survive this bounded edition job.
  const deadline = setTimeout(
    () => {
      encoder?.kill("SIGKILL");
      for (const child of children) child.kill("SIGKILL");
      void page.close();
    },
    Math.max(600000, duration * 3000),
  );
  try {
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.ready);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async (moduleURL) => {
      window.exportPersonaPCM = (await import(moduleURL)).exportPersonaPCM;
    }, `/@fs/${root}/src/cinematic/film/neural-voice.ts`);
    const measured = [];
    let spokenTotal = 0;
    for (const chapterId of selections[duration]) {
      const c = chapters[chapterId],
        phrases = [c[0], c[1], ...c[2].split(/(?<=[.!?])\s+(?=[A-Z])/u)]
          .map((t) => t.trim())
          .filter(Boolean);
      const items = [];
      for (const text of phrases) {
        const { samples, receipt, pcmSHA256, cached } = await phrasePCM(page, text);
        items.push({ text, samples, receipt, pcmSHA256 });
        console.log(
          `${id}: ${text.slice(0, 65)} / ${receipt.seconds.toFixed(3)}s ${receipt.device}${cached ? " cached" : " synthesized"}`,
        );
      }
      const speechSeconds = items.reduce((sum, i) => sum + i.receipt.seconds, 0);
      const minimum = speechSeconds + 0.3 * (items.length - 1) + 1.06;
      measured.push({ id: chapterId, items, minimum });
      spokenTotal += minimum;
    }
    if (spokenTotal > duration)
      throw Error(`Narration overrun ${spokenTotal.toFixed(3)} > ${duration}; no words truncated`);
    const spare = (duration - spokenTotal) / measured.length;
    const track = new Float32Array(duration * 24000),
      cues = [],
      shots = [];
    let at = 0;
    for (const shot of measured) {
      const start = at,
        end = start + shot.minimum + spare;
      let cursor = start + 0.53;
      for (const item of shot.items) {
        const offset = Math.round(cursor * 24000);
        if (offset + item.samples.length > track.length) throw Error("PCM outside film");
        track.set(item.samples, offset);
        const cue = {
          text: item.text,
          start: offset / 24000,
          end: (offset + item.samples.length) / 24000,
          chapter: shot.id,
          source: chapters[shot.id][3],
          status: chapters[shot.id][4],
          pcmSHA256: item.pcmSHA256,
          ...item.receipt,
        };
        cues.push(cue);
        cursor = cue.end + 0.3;
      }
      shots.push({ id: shot.id, start, end });
      at = end;
    }
    shots.at(-1).end = duration;
    const timeline = { duration, edition, chapters: shots, cues, samplingFps: 30, outputFps: 30 };
    await save(path.join(dir, "timeline.json"), timeline);
    await writeFile(
      path.join(dir, "captions.vtt"),
      "WEBVTT\n\n" +
        cues
          .map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`)
          .join("\n"),
    );
    await writeFile(
      path.join(dir, "transcript.txt"),
      measured
        .map(
          (s) =>
            chapters[s.id].slice(0, 3).join(" ") +
            "\nSource: " +
            chapters[s.id][3] +
            " / " +
            chapters[s.id][4],
        )
        .join("\n\n") + "\n",
    );
    await writeFile(path.join(dir, "narration.f32"), Buffer.from(track.buffer));
    const raw = path.join(dir, "narration-raw.wav");
    await ff([
      "-v",
      "error",
      "-n",
      "-f",
      "f32le",
      "-ar",
      "24000",
      "-ac",
      "1",
      "-i",
      path.join(dir, "narration.f32"),
      raw,
    ]);
    const audioMastering = await masterAudio(raw, path.join(dir, "narration.wav"));
    await page.evaluate((t) => {
      window.filmTimeline = t;
    }, timeline);
    const video = path.join(dir, id + ".mp4");
    const encoderArgs = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-n",
      "-threads",
      "2",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "-framerate",
      "30",
      "-i",
      "pipe:0",
      "-i",
      path.join(dir, "narration.wav"),
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      String(duration),
      "-movflags",
      "+faststart",
      video,
    ];
    encoder = spawn("ffmpeg", encoderArgs, { stdio: ["pipe", "ignore", "pipe"] });
    let fferr = "";
    encoder.stderr.on("data", (b) => (fferr = (fferr + b).slice(-4000)));
    encoder.stdin.on("error", () => {});
    const finished = once(encoder, "close");
    const cdp = await page.context().newCDPSession(page);
    const stillFrames = new Set([
      30,
      Math.floor(duration * 15),
      duration * 30 - 20,
      ...shots
        .slice(1)
        .flatMap((s) => [-0.4, 0.1, 0.7, 1.6].map((delta) => Math.round((s.start + delta) * 30))),
    ]);
    for (let frame = 0; frame < duration * 30; frame++) {
      if (encoder.exitCode !== null) throw Error(`Encoder exited early: ${fferr}`);
      await page.evaluate((p) => window.renderFrame(p.time, p.duration, p.edition), {
        time: frame / 30,
        duration,
        edition,
      });
      const captured = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 94,
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const jpg = Buffer.from(captured.data, "base64");
      if (stillFrames.has(frame)) await writeFile(path.join(dir, `sample-${frame}.jpg`), jpg);
      if (!encoder.stdin.write(jpg))
        await Promise.race([
          once(encoder.stdin, "drain"),
          finished.then(() => {
            throw Error(`Encoder stopped: ${fferr}`);
          }),
        ]);
      if (frame % 300 === 0) console.log(`${id}: frame ${frame}/${duration * 30}`);
    }
    encoder.stdin.end();
    const [code] = await finished;
    encoder = undefined;
    if (code !== 0) throw Error(fferr);
    if (errors.length) throw Error(errors.join("\n"));
    const verified = await inspect(video, duration);
    await ff([
      "-v",
      "error",
      "-n",
      "-ss",
      String(Math.max(0, shots[1].start - 2)),
      "-i",
      video,
      "-t",
      "7",
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-crf",
      "22",
      "-c:a",
      "aac",
      path.join(dir, "transition-preview.mp4"),
    ]);
    return {
      ...verified,
      status: "full_decode_verified",
      renderSamplingFps: 30,
      outputFps: 30,
      browserErrors: errors,
      browserVersion: browser.version(),
      narration: "New Abbey browser Kokoro PCM through shared AudioEngine offline graph",
      audioMastering,
      encoderArgs,
      phraseCount: cues.length,
      neuralTimingFile: "timeline.json",
    };
  } finally {
    clearTimeout(deadline);
    if (encoder) {
      encoder.kill("SIGKILL");
      encoder = undefined;
    }
    await page.close().catch(() => {});
  }
}
async function readValidatedAdaptationEdit(folder, duration) {
  const edit = await json(path.join(folder, "edit.json"));
  if (!Array.isArray(edit.chapters) || !edit.chapters.length)
    throw Error("Missing source edit provenance");
  const sourceTimings = Object.fromEntries(
    await Promise.all(
      [...new Set(edit.chapters.map((chapter) => chapter.sourceFilm))].map(async (film) => [
        film,
        (await json(path.join(root, "public/media/films", film + ".timing.json"))).measurements,
      ]),
    ),
  );
  const boundaryValidation = validateAdaptationEdit(edit, duration, sourceTimings);
  return { edit, boundaryValidation };
}
async function adaptationInputs(id) {
  const name = id.replace("mlai-quesar-", ""),
    folder = path.join(sourceEdits, name);
  const { edit } = await readValidatedAdaptationEdit(folder, Number(id.split("-").at(-1)));
  const files = [
    path.join(folder, id + ".mp4"),
    ...["edit.json", "captions.vtt", "transcript.txt", "verification.json"].map((f) =>
      path.join(folder, f),
    ),
  ];
  for (const film of new Set(edit.chapters.map((c) => c.sourceFilm)))
    for (const ext of ["mp4", "timing.json"])
      files.push(path.join(root, "public/media/films", `${film}.${ext}`));
  return Object.fromEntries(
    await Promise.all(files.map(async (f) => [path.relative(root, f), await fileHash(f)])),
  );
}
async function adaptation(id, dir, duration) {
  const name = id.replace("mlai-quesar-", ""),
    source = path.join(sourceEdits, name, id + ".mp4");
  const sourceEdit = path.join(sourceEdits, name, "edit.json");
  const { edit, boundaryValidation } = await readValidatedAdaptationEdit(
    path.dirname(sourceEdit),
    duration,
  );
  await inspect(source, duration, false);
  const inheritedSourceHashes = {
    master: await fileHash(source),
    edit: await fileHash(sourceEdit),
  };
  for (const film of new Set(edit.chapters.map((c) => c.sourceFilm))) {
    inheritedSourceHashes[`${film}.mp4`] = await fileHash(
      path.join(root, "public/media/films", film + ".mp4"),
    );
    inheritedSourceHashes[`${film}.timing.json`] = await fileHash(
      path.join(root, "public/media/films", film + ".timing.json"),
    );
  }
  const raw = path.join(dir, "inherited-audio.wav");
  await ff(["-v", "error", "-n", "-i", source, "-vn", "-c:a", "pcm_s24le", raw]);
  const audioMastering = await masterAudio(raw, path.join(dir, "narration.wav"));
  const video = path.join(dir, id + ".mp4");
  const visualFilter = "eq=contrast=1.025:saturation=0.97:brightness=0.002,unsharp=5:5:0.22:5:5:0";
  await ff(
    [
      "-v",
      "error",
      "-n",
      "-threads",
      "2",
      "-i",
      source,
      "-i",
      path.join(dir, "narration.wav"),
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-vf",
      visualFilter,
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      String(duration),
      "-movflags",
      "+faststart",
      video,
    ],
    Math.max(300000, duration * 1500),
  );
  for (const file of ["captions.vtt", "transcript.txt", "edit.json"])
    await copyFile(path.join(sourceEdits, name, file), path.join(dir, file));
  await ff([
    "-v",
    "error",
    "-n",
    "-ss",
    String(duration / 2),
    "-i",
    video,
    "-frames:v",
    "1",
    path.join(dir, "middle.jpg"),
  ]);
  return {
    ...(await inspect(video, duration)),
    status: "encoded_and_full_decode_verified",
    narration: "Inherited complete original browser-neural performances; no new synthesis",
    inheritedSourceHashes,
    sourceEdit: edit,
    boundaryValidation,
    visualFilter,
    audioMastering,
  };
}
try {
  await mkdir(output, { recursive: true });
  for (const id of ids) {
    const duration = Number(id.split("-").at(-1)),
      dir = path.join(output, id),
      video = path.join(dir, id + ".mp4");
    const inheritedInput = id.startsWith("mlai-") ? await adaptationInputs(id) : null;
    const inputDigest = sha(JSON.stringify({ sourceDigest, id, version, inheritedInput }));
    if (await exists(dir)) {
      const receipt = await json(path.join(dir, "verification.json"));
      if (
        !["full_decode_verified", "encoded_and_full_decode_verified"].includes(receipt.status) ||
        !receipt.fileHashes ||
        Object.keys(receipt.fileHashes).length < 3 ||
        !receipt.sha256
      )
        throw Error(`${id}: incomplete receipt`);
      assertMatchingSourceDigest(receipt.inputDigest, inputDigest);
      for (const [f, hash] of Object.entries(receipt.fileHashes ?? {}))
        if ((await fileHash(path.join(dir, f))) !== hash)
          throw Error(`${id}: changed sidecar ${f}`);
      const checked = await inspect(video, duration);
      if (checked.sha256 !== receipt.sha256) throw Error(`${id}: changed media hash`);
      assertMatchingSourceDigest(
        sourceDigest,
        (await collectSourceManifest(provenanceInputs)).digest,
      );
      console.log(`Resumed only after matching source/media hashes and fresh full decode: ${id}`);
      continue;
    }
    if (args.includes("--verify")) throw Error(`${id}: no verified output`);
    if (args.includes("--preflight")) {
      console.log(`Ready ${id}: ${duration}s -> ${dir}`);
      continue;
    }
    const scratch = path.join(output, `.partial-${id}-${randomUUID()}`);
    await mkdir(scratch);
    await save(path.join(scratch, "job.json"), {
      id,
      version,
      inputDigest,
      sources,
      startedAt: new Date().toISOString(),
    });
    try {
      const result = id.startsWith("quesar-")
        ? await quesar(id, scratch, duration)
        : await adaptation(id, scratch, duration);
      if (
        inheritedInput &&
        JSON.stringify(await adaptationInputs(id)) !== JSON.stringify(inheritedInput)
      )
        throw Error("Adaptation inputs changed during mastering");
      assertMatchingSourceDigest(
        sourceDigest,
        (await collectSourceManifest(provenanceInputs)).digest,
      );
      const fileHashes = {};
      for (const f of [
        "captions.vtt",
        "transcript.txt",
        id.startsWith("quesar-") ? "timeline.json" : "edit.json",
      ])
        fileHashes[f] = await fileHash(path.join(scratch, f));
      await save(path.join(scratch, "verification.json"), {
        ...result,
        id,
        version,
        inputDigest,
        sources,
        externalImports: sourceManifest.externalImports,
        inheritedInput,
        fileHashes,
        verifiedAt: new Date().toISOString(),
        visualReview: "pending",
        listeningReview: "pending",
        listeningAccepted: false,
        visualReviewAccepted: false,
      });
      await rename(scratch, dir);
      console.log(`Verified ${id}: ${dir}`);
    } catch (e) {
      await save(path.join(scratch, "failure.json"), {
        error: String(e),
        failedAt: new Date().toISOString(),
      });
      throw Error(`${e.message}\nInterrupted output preserved: ${scratch}`, { cause: e });
    }
  }
} finally {
  await shutdown();
}
