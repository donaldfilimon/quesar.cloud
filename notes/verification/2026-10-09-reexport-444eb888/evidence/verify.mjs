import { chromium } from "@playwright/test";
import { readFile, writeFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { filmCollection } from "/Users/donaldfilimon/dev/active/quesar.cloud/src/lib/mlai/categories/film-collection.ts";
import { captions } from "/Users/donaldfilimon/dev/active/quesar.cloud/scripts/narrated-film.ts";
const exec = promisify(execFile);
const root = "public/media/films";
const evidence = "notes/verification/2026-10-09-reexport-444eb888/evidence";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const film of filmCollection) {
    const file = `${root}/${film.id}.mp4`;
    try {
      await stat(file);
    } catch {
      console.log(`${film.id}: pending`);
      continue;
    }
    const timing = JSON.parse(await readFile(`${root}/${film.id}.timing.json`));
    if (
      timing.catalogHash !== hash(JSON.stringify(film)) ||
      timing.rate !== 24000 ||
      timing.measurements.length !== film.cues.length
    )
      throw Error(`Catalog drift ${film.id}`);
    for (const [i, c] of film.cues.entries()) {
      const m = timing.measurements[i];
      for (const k of Object.keys(c))
        if (JSON.stringify(m[k]) !== JSON.stringify(c[k])) throw Error(`Cue drift ${c.id}`);
      if (m.overrun || m.samples > Math.round((c.end - c.start) * 24000))
        throw Error(`Overrun ${c.id}`);
    }
    if ((await readFile(`${root}/${film.id}.vtt`, "utf8")) !== captions(film))
      throw Error("Caption drift");
    if (
      (await readFile(`${root}/${film.id}.transcript.txt`, "utf8")) !==
      film.cues.map((c) => c.text).join("\n\n") + "\n"
    )
      throw Error("Transcript drift");
    if (
      JSON.stringify(JSON.parse(await readFile(`${root}/${film.id}.chapters.json`))) !==
      JSON.stringify(film.chapters)
    )
      throw Error("Chapter drift");
    const probe = JSON.parse(
      (
        await exec(
          "ffprobe",
          [
            "-v",
            "error",
            "-threads",
            "2",
            "-count_frames",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            file,
          ],
          { timeout: 180000 },
        )
      ).stdout,
    );
    const v = probe.streams.find((s) => s.codec_type === "video"),
      a = probe.streams.find((s) => s.codec_type === "audio");
    if (
      v.codec_name !== "h264" ||
      v.width !== 1920 ||
      v.height !== 1080 ||
      v.avg_frame_rate !== "30/1" ||
      Number(v.nb_read_frames) !== Math.ceil(film.duration * 30) ||
      a.codec_name !== "aac" ||
      Math.abs(Number(a.duration) - film.duration) > 0.1 ||
      Number(probe.format.size) >= 100 * 1024 * 1024
    )
      throw Error(`Encoded contract ${film.id}`);
    await exec(
      "ffmpeg",
      [
        "-v",
        "error",
        "-xerror",
        "-threads",
        "2",
        "-i",
        file,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0",
        "-f",
        "null",
        "-",
      ],
      { timeout: 180000 },
    );
    const decoded = (
      await exec(
        "ffmpeg",
        [
          "-v",
          "error",
          "-threads",
          "2",
          "-i",
          file,
          "-vn",
          "-f",
          "f32le",
          "-ar",
          "24000",
          "-ac",
          "1",
          "pipe:1",
        ],
        { encoding: "buffer", maxBuffer: 40 * 1024 * 1024, timeout: 120000 },
      )
    ).stdout;
    const pcm = new Float32Array(decoded.buffer, decoded.byteOffset, decoded.length / 4);
    let peak = 0;
    for (const n of pcm) {
      if (!Number.isFinite(n)) throw Error("Invalid decoded PCM");
      peak = Math.max(peak, Math.abs(n));
    }
    if (peak >= 1) throw Error("Clipping");
    const cueAudio = [];
    let gapStart = 0;
    const tolerance = 0.06;
    let gapPeak = 0;
    for (const c of timing.measurements) {
      let sum = 0,
        count = 0,
        first = null,
        last = null;
      const start = Math.round(c.start * 24000),
        end = start + c.samples;
      for (let j = gapStart; j < Math.max(gapStart, start - Math.ceil(tolerance * 24000)); j++)
        gapPeak = Math.max(gapPeak, Math.abs(pcm[j]));
      for (let j = start; j < end; j++) {
        sum += pcm[j] * pcm[j];
        count++;
        if (Math.abs(pcm[j]) > 0.002) {
          first ??= j / 24000;
          last = j / 24000;
        }
      }
      const rms = Math.sqrt(sum / count);
      if (rms < 0.001 || first === null) throw Error(`Missing narration ${c.id}`);
      cueAudio.push({
        id: c.id,
        scheduledStart: c.start,
        measuredSeconds: c.seconds,
        decodedFirstAudible: first,
        decodedLastAudible: last,
        rms,
      });
      gapStart = end + Math.ceil(tolerance * 24000);
    }
    for (let j = gapStart; j < pcm.length; j++) gapPeak = Math.max(gapPeak, Math.abs(pcm[j]));
    if (gapPeak > 0.002) throw Error(`Unexpected speech in gaps ${film.id}: ${gapPeak}`);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto("http://127.0.0.1:4218/");
    await page.setContent(
      `<style>body{margin:0;background:black}video{width:100vw;height:100vh}</style><video src="http://127.0.0.1:4218/${film.id}.mp4"></video>`,
    );
    await page.locator("video").evaluate(async (v) => {
      v.muted = true;
      await v.play();
    });
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0.1);
    for (const [i, time] of [0, film.duration / 2, film.duration - 1 / 30].entries()) {
      await page.locator("video").evaluate(async (v, time) => {
        v.pause();
        if (v.currentTime !== time)
          await new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(Error("Seek timeout")), 10000);
            v.addEventListener(
              "seeked",
              () => {
                clearTimeout(t);
                resolve();
              },
              { once: true },
            );
            v.currentTime = time;
          });
      }, time);
      await page.screenshot({ path: `${evidence}/${film.id}.decoded-${i}.png` });
    }
    const playback = await page.locator("video").evaluate(async (v) => {
      v.currentTime = 0;
      v.playbackRate = 16;
      await v.play();
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(Error("Full playback timeout")), 60000);
        v.addEventListener(
          "ended",
          () => {
            clearTimeout(t);
            resolve();
          },
          { once: true },
        );
        v.addEventListener(
          "error",
          () => {
            clearTimeout(t);
            reject(Error("Playback error"));
          },
          { once: true },
        );
      });
      return {
        ended: v.ended,
        currentTime: v.currentTime,
        duration: v.duration,
        width: v.videoWidth,
        height: v.videoHeight,
        error: v.error?.code ?? null,
        muted: v.muted,
        rate: v.playbackRate,
      };
    });
    await page.close();
    results.push({
      id: film.id,
      status: "current_full_decode_and_complete_muted_browser_playback",
      sha256: hash(await readFile(file)),
      catalogHash: timing.catalogHash,
      duration: film.duration,
      frames: Number(v.nb_read_frames),
      bytes: Number(probe.format.size),
      videoCodec: v.codec_name,
      audioCodec: a.codec_name,
      dimensions: [v.width, v.height],
      fps: v.avg_frame_rate,
      fullDecodeExitCode: 0,
      audio: {
        rate: 24000,
        decodedSamples: pcm.length,
        peak,
        gapPeak,
        toleranceSeconds: tolerance,
        measuredCues: cueAudio,
      },
      playback,
    });
    console.log(
      `${film.id}: ${v.nb_read_frames} frames, full decode + full browser playback pass, ${cueAudio.length} audible cues`,
    );
    await writeFile(
      `${evidence}/verification.json`,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          listeningPerformed: false,
          limitations: [
            "Complete browser playback was muted at16x; human listening and speech accuracy acceptance remain unverified.",
            "Existing synthesis receipts name model and dtype but do not pin immutable model-weight revision.",
          ],
          results,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser.close();
}
