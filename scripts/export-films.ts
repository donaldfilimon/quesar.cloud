// Frame transport for the separately reviewed narration/encoding step. No CLI
// auto-run: Task 3 supplies audited PCM and encoder settings before invoking it.
import { chromium, type BrowserContext } from "@playwright/test";
import { Readable, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { FilmCaptureAPI } from "../src/cinematic/film/capture.ts";

export interface FrameReceipt {
  frame: number;
  time: number;
  board: string | null;
}
export interface FilmFrameRenderer {
  duration: number;
  frameCount: number;
  seed: number;
  render(frame: number): Promise<{ png: Buffer; receipt: FrameReceipt }>;
  close(): Promise<void>;
}

export function captureURL(origin: string, film: string): URL {
  const base = new URL(origin);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) ||
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password
  )
    throw new Error("Film capture requires a loopback origin without credentials");
  if (!["film", "trailer", "abbey", "explainer", "mega", "design"].includes(film))
    throw new Error(`Unknown film: ${film}`);
  return new URL(`/showcase/${film}?capture=1`, base.origin);
}

export async function openFilmRenderer(origin: string, film: string): Promise<FilmFrameRenderer> {
  const url = captureURL(origin, film);
  const browser = await chromium.launch({ headless: true });
  let context: BrowserContext | undefined;
  try {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "no-preference",
    });
    const forbidden: string[] = [];
    await context.route("**/*", async (route) => {
      const request = new URL(route.request().url());
      if (["http:", "https:"].includes(request.protocol) && request.origin !== url.origin) {
        forbidden.push(request.origin);
        await route.abort();
      } else await route.continue();
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url.href);
    await page.waitForFunction(() => !!window.__filmCapture, undefined, { timeout: 30000 });
    const metadata = await page.evaluate(() => {
      const api = window.__filmCapture!;
      return { duration: api.duration, seed: api.seed, fps: api.fps };
    });
    if (metadata.fps !== 30) throw new Error("Capture rate must be 30fps");
    const session = await context.newCDPSession(page);
    let busy = false;
    return {
      duration: metadata.duration,
      frameCount: Math.ceil(metadata.duration * metadata.fps),
      seed: metadata.seed,
      async render(frame) {
        if (busy) throw new Error("Concurrent frame screenshots are forbidden");
        busy = true;
        try {
          const receipt = await page.evaluate(
            (value) => (window.__filmCapture as FilmCaptureAPI).renderFrame(value),
            frame,
          );
          // renderFrame owns font/image/animation readiness. Chromium's faster
          // lossless PNG compression avoids spending most capture time zipping
          // frames that are immediately decoded again by FFmpeg.
          const screenshot = await session.send("Page.captureScreenshot", {
            format: "png",
            optimizeForSpeed: true,
            captureBeyondViewport: false,
            fromSurface: true,
          });
          const png = Buffer.from(screenshot.data, "base64");
          if (errors.length || forbidden.length)
            throw new Error(
              `Capture failed: ${[...errors, ...forbidden.map((host) => `External request: ${host}`)].join("; ")}`,
            );
          return { png, receipt };
        } finally {
          busy = false;
        }
      },
      close: () => browser.close(),
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/** Pipe directly into an owned FFmpeg process's stdin. pipeline provides
 * backpressure, propagates encoder/EPIPE failures and ends stdin after the last
 * frame. At most the current PNG and stream buffers are retained, never a frame
 * directory. The caller owns FFmpeg's exit code and the renderer's finally close. */
export async function streamFilmFrames(
  renderer: FilmFrameRenderer,
  ffmpegStdin: Writable,
  onFrame?: (receipt: FrameReceipt) => void,
): Promise<void> {
  async function* frames() {
    for (let frame = 0; frame < renderer.frameCount; frame++) {
      const { png, receipt } = await renderer.render(frame);
      onFrame?.(receipt);
      yield png;
    }
  }
  await pipeline(Readable.from(frames(), { objectMode: false, highWaterMark: 1 }), ffmpegStdin);
}
