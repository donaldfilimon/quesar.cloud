import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import path from "node:path";
const base = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:8197");
await page.waitForFunction(() => window.ready);
let checks = 0;
for (const edition of ["architecture", "studio"])
  for (const duration of [60, 120, 180, 600]) {
    const n = await page.evaluate((d) => window.selections[d].length, duration);
    for (let i = 0; i < n; i++) {
      await page.evaluate(({ t, d, e }) => window.renderFrame(t, d, e), {
        t: ((i + 0.5) * duration) / n,
        d: duration,
        e: edition,
      });
      const box = await page.evaluate(() => {
        const a = document.querySelector("article")!.getBoundingClientRect(),
          p = document.querySelector("p")!.getBoundingClientRect(),
          h = document.querySelector("h1")!.getBoundingClientRect(),
          f = document.querySelector("footer")!.getBoundingClientRect();
        return {
          bodyOverflow: p.bottom > f.top,
          headline: h.bottom > p.top + 1,
          articleRight: a.right,
          paragraphRight: p.right,
        };
      });
      if (box.bodyOverflow || box.headline)
        throw Error(JSON.stringify({ edition, duration, i, box }));
      checks++;
    }
    await page.screenshot({ path: path.join(base, `${edition}-${duration}-review.jpg`) });
  }
if (errors.length) throw Error(errors.join("\n"));
writeFileSync(
  path.join(base, "browser-verification.json"),
  JSON.stringify(
    { checks, browserErrors: errors, viewport: [1920, 1080], status: "passed" },
    null,
    2,
  ),
);
console.log(`Passed ${checks} chapter layout checks`);
await browser.close();
