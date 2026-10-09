import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const origin = 'http://127.0.0.1:4198/';
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  const videos = page.locator('video');
  if (await videos.count() !== 8) throw new Error('Missing edition in gallery');
  for (let i = 0; i < 8; i++) {
    const video = videos.nth(i);
    const result = await video.evaluate(async element => {
      let timer;
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Playback timeout')), 60000); });
      return Promise.race([timeout, (async () => {
        element.muted = true;
        await element.play();
        await new Promise(resolve => element.requestVideoFrameCallback(resolve));
        element.pause();
        const duration = element.duration;
        const track = element.textTracks[0];
        track.mode = 'hidden';
        await new Promise((resolve, reject) => {
          const deadline = Date.now() + 10000;
          const check = () => {
            if (track.cues?.length) return resolve();
            if (Date.now() > deadline) return reject(new Error('Caption load timeout'));
            setTimeout(check, 50);
          };
          check();
        });
        for (const cue of track.cues) {
          if (cue.startTime < 0 || cue.endTime > duration) throw new Error('Caption out of bounds');
        }
        for (const time of [duration / 2, duration - 1]) {
          await new Promise((resolve, reject) => {
            element.addEventListener('seeked', resolve, { once: true });
            element.addEventListener('error', () => reject(new Error('Media decode error')), { once: true });
            element.currentTime = time;
          });
        }
        if (element.error) throw new Error(`Media error ${element.error.code}`);
        return { src: element.currentSrc, duration, width: element.videoWidth, height: element.videoHeight, decodedFrames: element.getVideoPlaybackQuality().totalVideoFrames, captionCues: track.cues.length, error: null };
      })()]).finally(() => clearTimeout(timer));
    });
    if (result.width !== 1920 || result.height !== 1080 || result.duration !== Number(result.src.match(/-(\d+)\.mp4$/)[1])) throw new Error('Playback contract failed');
    results.push(result);
    console.log(`Browser decoded ${result.src}: ${result.duration}s`);
    // Cancel the completed video's download before opening another master.
    // A simple local server may ignore byte ranges; paused downloads would
    // otherwise occupy Chromium's per-origin connections and starve captions.
    await video.evaluate(element => {
      element.pause();
      element.querySelector('source').removeAttribute('src');
      element.load();
    });
  }
  await page.screenshot({ path: fileURLToPath(new URL('gallery-desktop.png', import.meta.url)), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow || errors.length) throw new Error(JSON.stringify({ overflow, errors }));
  await page.screenshot({ path: fileURLToPath(new URL('gallery-mobile.png', import.meta.url)), fullPage: true });
  await writeFile(new URL('browser-verification.json', import.meta.url), JSON.stringify({ results, overflow, errors, listeningAccepted: false }, null, 2));
} finally {
  await browser.close();
}
