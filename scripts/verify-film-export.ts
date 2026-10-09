import { chromium } from "@playwright/test";
import { readFile, writeFile, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import path from "node:path";
import { filmCollection } from "../src/lib/mlai/categories/film-collection.ts";
const exec = promisify(execFile);
const [directory, origin] = process.argv.slice(2);
if (!directory || !origin || !["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error(
    "Usage: node scripts/verify-film-export.ts <directory> <loopback-origin-serving-directory>",
  );
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const film of filmCollection) {
    const timing = JSON.parse(
      await readFile(path.join(directory, `${film.id}.timing.json`), "utf8"),
    ) as {
      measurements: {
        id: string;
        text: string;
        seconds: number;
        start: number;
        end: number;
        overrun?: boolean;
      }[];
    };
    const overruns = timing.measurements.filter(
      (cue) => Math.round(cue.seconds * 24000) > Math.round((cue.end - cue.start) * 24000),
    );
    const file = path.join(directory, `${film.id}.mp4`);
    try {
      await access(file);
    } catch {
      results.push({
        id: film.id,
        status: "not_encoded",
        measuredCues: timing.measurements.length,
        overruns,
      });
      continue;
    }
    const { stdout } = await exec(
      "ffprobe",
      ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", file],
      { timeout: 120000 },
    );
    const probe = JSON.parse(stdout) as {
      streams: {
        codec_type: string;
        codec_name: string;
        width?: number;
        height?: number;
        avg_frame_rate?: string;
        nb_read_frames?: string;
        duration: string;
      }[];
      format: { size: string };
    };
    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    if (
      overruns.length ||
      video?.codec_name !== "h264" ||
      video.width !== 1920 ||
      video.height !== 1080 ||
      video.avg_frame_rate !== "30/1" ||
      Number(video.nb_read_frames) !== Math.ceil(film.duration * 30) ||
      audio?.codec_name !== "aac" ||
      Math.abs(Number(audio.duration) - film.duration) > 0.1 ||
      Number(probe.format.size) >= 100 * 1024 * 1024
    )
      throw new Error(`Invalid encoded contract: ${film.id}`);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(origin);
    await page.setContent(
      `<style>body{margin:0;background:black}video{width:100vw;height:100vh}</style><video controls src="${new URL(`${film.id}.mp4`, origin).href}"></video>`,
    );
    await page.locator("video").evaluate(async (element) => {
      const video = element as HTMLVideoElement;
      video.muted = true;
      await video.play();
    });
    await page.waitForFunction(() => document.querySelector("video")!.currentTime > 0.2);
    const frames = [0, film.duration / 2, film.duration - 1 / 30];
    for (const [index, time] of frames.entries()) {
      await page.locator("video").evaluate(async (element, time) => {
        const video = element as HTMLVideoElement;
        video.pause();
        if (video.currentTime !== time)
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Video seek timeout")), 10000);
            video.addEventListener(
              "seeked",
              () => {
                clearTimeout(timer);
                resolve();
              },
              { once: true },
            );
            video.currentTime = time;
          });
      }, time);
      await page.screenshot({ path: path.join(directory, `${film.id}.decoded-${index}.png`) });
    }
    const playback = await page.locator("video").evaluate((element) => ({
      duration: (element as HTMLVideoElement).duration,
      width: (element as HTMLVideoElement).videoWidth,
      height: (element as HTMLVideoElement).videoHeight,
      error: (element as HTMLVideoElement).error?.code ?? null,
    }));
    await page.close();
    results.push({
      id: film.id,
      status: "encoded_and_browser_decoded_not_listening_accepted",
      measuredCues: timing.measurements.length,
      overruns,
      sha256: createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
      probe,
      playback,
    });
  }
  await writeFile(
    path.join(directory, "verification.json"),
    JSON.stringify({ listeningPerformed: false, results }, null, 2),
  );
  console.log(
    JSON.stringify(
      results.map((result) => ({
        id: result.id,
        status: result.status,
        measuredCues: result.measuredCues,
        overruns: result.overruns.map((cue) => ({
          id: cue.id,
          text: cue.text,
          seconds: cue.seconds,
          budget: cue.end - cue.start,
        })),
      })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
