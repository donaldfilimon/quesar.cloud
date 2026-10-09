import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat, mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const discoveryFailure = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "ENOENT" ? "skipped" : "failed";
async function discoverArtifact(root: string, name: string, duration: number) {
  const verification = JSON.parse(
    await readFile(path.join(root, name, "verification.json"), "utf8"),
  ) as { status: string; sha256: string };
  if (verification.status !== "full_decode_verified")
    throw Error("Invalid full decode verification status");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path.join(root, name, `${name}.mp4`)))
    hash.update(chunk);
  const sha256 = hash.digest("hex");
  if (sha256 !== verification.sha256)
    throw Error("Current MP4 SHA256 differs from renderer verification");
  await stat(path.join(root, name, "captions.vtt"));
  return { name, duration, sha256, hashVerified: true };
}
async function closeResources(browser: { close(): Promise<void> } | undefined, server: Server) {
  try {
    await browser?.close();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

if (process.argv.includes("--self-test")) {
  const root = await mkdtemp(path.join(tmpdir(), "native-video-verifier-"));
  const name = "fixture",
    directory = path.join(root, name);
  let checks = 0;
  try {
    await mkdir(directory);
    const media = Buffer.from("fixture media");
    await writeFile(path.join(directory, `${name}.mp4`), media);
    await writeFile(path.join(directory, "captions.vtt"), "WEBVTT");
    const verification = {
      status: "full_decode_verified",
      sha256: createHash("sha256").update(media).digest("hex"),
    };
    const writeVerification = (value: string) =>
      writeFile(path.join(directory, "verification.json"), value);
    await writeVerification(JSON.stringify(verification));
    assert.equal((await discoverArtifact(root, name, 1)).hashVerified, true);
    checks++;
    await writeVerification("{");
    await assert.rejects(discoverArtifact(root, name, 1), SyntaxError);
    checks++;
    await writeVerification(JSON.stringify({ ...verification, status: "pending" }));
    await assert.rejects(discoverArtifact(root, name, 1), /Invalid full decode/);
    checks++;
    await writeVerification(JSON.stringify({ ...verification, sha256: "wrong" }));
    await assert.rejects(discoverArtifact(root, name, 1), /SHA256 differs/);
    checks++;
    await assert.rejects(
      discoverArtifact(root, "absent", 1),
      (error) => discoveryFailure(error) === "skipped",
    );
    checks++;
    assert.equal(discoveryFailure({ code: "EACCES" }), "failed");
    checks++;
    assert.equal(discoveryFailure(new SyntaxError("malformed")), "failed");
    checks++;
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    await assert.rejects(
      closeResources(
        {
          close: async () => {
            throw Error("Injected browser close failure");
          },
        },
        server,
      ),
      /Injected browser/,
    );
    assert.equal(server.listening, false);
    checks++;
    console.log(`Passed ${checks} verifier regression checks`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  process.exit(0);
}

const base = path.dirname(fileURLToPath(import.meta.url));
const artifacts = path.join(base, "artifacts-native30");
const receipts = path.resolve(base, "../trailer-editions-2026-10-09/receipts");
await mkdir(receipts, { recursive: true });
const completed: Awaited<ReturnType<typeof discoverArtifact>>[] = [],
  skipped: { name: string; reason: string }[] = [],
  results: {
    name: string;
    duration: number;
    status: string;
    stage?: string;
    error?: string;
    captionCues?: number;
    decodedFrames?: number;
  }[] = [],
  errors: string[] = [];
for (const edition of ["architecture", "studio"])
  for (const duration of [60, 120, 180, 600]) {
    const name = `quesar-${edition}-${duration}`;
    try {
      completed.push(await discoverArtifact(artifacts, name, duration));
    } catch (error) {
      if (discoveryFailure(error) === "skipped")
        skipped.push({ name, reason: "Incomplete: verification or media absent" });
      else
        results.push({
          name,
          duration,
          status: "failed",
          stage: "discovery",
          error: error instanceof Error ? error.message : String(error),
        });
    }
  }
// Own an ephemeral loopback server; never reuse or stop the active renderer server.
const server = createServer(async (request, response) => {
  try {
    const parts = new URL(request.url!, "http://localhost").pathname.split("/").filter(Boolean);
    if (
      parts.length !== 2 ||
      !completed.some((item) => item.name === parts[0]) ||
      ![`${parts[0]}.mp4`, "captions.vtt"].includes(parts[1])
    ) {
      response.writeHead(404).end();
      return;
    }
    const file = path.join(artifacts, ...parts),
      { size } = await stat(file);
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0,
      end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      response.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    response.writeHead(range ? 206 : 200, {
      "Content-Type": file.endsWith(".vtt") ? "text/vtt" : "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    });
    const stream = createReadStream(file, { start, end });
    response.on("close", () => stream.destroy());
    stream.on("error", () => response.destroy());
    stream.pipe(response);
  } catch {
    response.writeHead(500).end();
  }
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
console.log(`Owned loopback server: pid ${process.pid}, ${origin}, root ${artifacts}`);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const item of completed) {
    try {
      await page.goto(`${origin}/${item.name}/captions.vtt`);
      await page.setContent(
        `<style>body{margin:0;background:#111;color:white;font:20px system-ui}h1{padding:20px}video{display:block;width:100%;max-width:1920px}</style><h1>${item.name}</h1><video controls preload="none" muted><source src="${origin}/${item.name}/${item.name}.mp4" type="video/mp4"><track kind="captions" src="${origin}/${item.name}/captions.vtt" srclang="en" label="English"></video>`,
      );
      const result = await page.locator("video").evaluate(async (element: HTMLVideoElement) => {
        const deadline = async <T>(task: Promise<T>): Promise<T> => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            return await Promise.race([
              task,
              new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(Error("Media operation timeout")), 60000);
              }),
            ]);
          } finally {
            clearTimeout(timer);
          }
        };
        await deadline(element.play());
        await deadline(
          new Promise<number>((resolve) => element.requestVideoFrameCallback(resolve)),
        );
        element.pause();
        const track = element.textTracks[0];
        track.mode = "hidden";
        await deadline(
          new Promise<void>((resolve) => {
            const check = () => (track.cues?.length ? resolve() : setTimeout(check, 50));
            check();
          }),
        );
        const duration = element.duration;
        for (const cue of track.cues!)
          if (cue.startTime < 0 || cue.endTime > duration + 0.06 || cue.endTime <= cue.startTime)
            throw Error("Invalid caption timing");
        const seeks = [];
        for (const time of [duration / 2, duration - 1]) {
          await deadline(
            new Promise<void>((resolve, reject) => {
              element.addEventListener("seeked", () => resolve(), { once: true });
              element.addEventListener("error", () => reject(Error("Media decode error")), {
                once: true,
              });
              element.currentTime = time;
            }),
          );
          if (Math.abs(element.currentTime - time) > 0.1) throw Error("Seek time mismatch");
          seeks.push(element.currentTime);
        }
        if (element.error) throw Error(`Media error ${element.error.code}`);
        track.mode = "showing";
        return {
          duration,
          width: element.videoWidth,
          height: element.videoHeight,
          decodedFrames: element.getVideoPlaybackQuality().totalVideoFrames,
          captionCues: track.cues!.length,
          seeks,
        };
      });
      if (
        result.width !== 1920 ||
        result.height !== 1080 ||
        Math.abs(result.duration - item.duration) > 0.06 ||
        result.decodedFrames < 1
      )
        throw Error("Playback contract failed");
      await page.screenshot({ path: path.join(receipts, `${item.name}-native-browser.png`) });
      results.push({ ...item, status: "passed", ...result });
      console.log(`Passed ${item.name}: playback, captions, 2 seeks`);
    } catch (error) {
      results.push({
        ...item,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // Explicitly cancel every master download, including failed tests.
      await page.locator("video").evaluateAll((elements) =>
        elements.forEach((node) => {
          const element = node as HTMLVideoElement;
          element.pause();
          element.removeAttribute("src");
          element.querySelectorAll("source,track").forEach((child) => child.removeAttribute("src"));
          element.load();
        }),
      );
    }
  }
} finally {
  try {
    await closeResources(browser, server);
  } catch (error) {
    errors.push(`Resource cleanup: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log("Owned loopback server closed");
}
const failed = results.filter((item) => item.status === "failed");
const receipt = {
  generatedAt: new Date().toISOString(),
  status: failed.length || errors.length ? "failed" : skipped.length ? "partial" : "passed",
  results,
  skipped,
  browserErrors: errors,
  server: { root: artifacts, pid: process.pid, origin, closed: true },
  listeningAccepted: false,
  fullPlaybackAccepted: false,
};
await writeFile(
  path.join(receipts, "native-browser-verification.json"),
  JSON.stringify(receipt, null, 2),
);
await writeFile(
  path.join(receipts, "native-acceptance-report.md"),
  `# Native final browser acceptance\n\n${receipt.generatedAt}\n\nStatus: ${receipt.status}. ${results.filter((item) => item.status === "passed").length}/${completed.length} discovered completed films passed; ${failed.length} failures; ${skipped.length}/8 editions skipped as incomplete.\n\nChecks: Chromium decoded playback at 1920×1080, duration tolerance 0.06 s, nonempty captions with valid timings, midpoint and final-second seeks, screenshots. This is sampled browser acceptance; full-duration browser playback and subjective listening/visual review remain unverified. Renderer verification.json supplies separate full FFmpeg decode evidence.\n\n${results.map((item) => `- ${item.name}: ${item.status}${item.error ? ` — ${item.error}` : `; ${item.captionCues} caption cues; ${item.decodedFrames} decoded frames; 2 seeks`}`).join("\n")}\n${skipped.map((item) => `- ${item.name}: skipped — ${item.reason}`).join("\n")}\n\nBrowser errors: ${JSON.stringify(errors)}. Own loopback server PID ${process.pid}, ${origin}, serving ${artifacts}; closed on teardown. Every video source was cleared and load() called before the next film.\n\nRerun: node notes/launch/quesar-editorial-2026-10-09/verify-native-video.ts\n`,
);
if (failed.length || errors.length) process.exitCode = 1;
