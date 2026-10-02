import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { openFilmRenderer } from "../../scripts/export-films";

const cases = [
  { film: "film", frames: [0, 1020, 2069] },
  { film: "trailer", frames: [0, 930, 1859] },
  { film: "abbey", frames: [0, 690, 1139] },
  { film: "explainer", frames: [0, 1980, 3959] },
  { film: "mega", frames: [0, 4530, 8459] },
  { film: "design", frames: [150, 450, 750, 1050, 1350, 1650, 1950, 2250, 2399] },
];
for (const { film, frames } of cases)
  test(`${film}: independently repeated and revisited controlled frames`, async ({
    baseURL,
  }, testInfo) => {
    test.setTimeout(240000);
    const hashes = new Map<number, string>();
    const results = [];
    for (let run = 0; run < 2; run++) {
      const renderer = await openFilmRenderer(baseURL!, film);
      try {
        for (const frame of run === 0
          ? [...frames, ...[...frames].reverse()]
          : [...frames].reverse()) {
          const start = performance.now();
          const { png, receipt } = await renderer.render(frame);
          const hash = createHash("sha256").update(png).digest("hex");
          if (hashes.has(frame))
            expect(hash, `${film} frame ${frame}, run ${run}`).toBe(hashes.get(frame));
          else {
            hashes.set(frame, hash);
            await testInfo.attach(`${film}-${frame}.png`, { body: png, contentType: "image/png" });
          }
          results.push({ ...receipt, hash, run, milliseconds: performance.now() - start });
        }
      } finally {
        await renderer.close();
      }
    }
    await testInfo.attach("frame-hashes.json", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });
  });

test("capture has no controls, persisted position, voice requests or global API after navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("mlai-film:t", "42");
    const reads: string[] = [],
      writes: string[] = [];
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      reads.push(key);
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      writes.push(key);
      return set.call(this, key, value);
    };
    Object.assign(window, { captureStorage: { reads, writes } });
  });
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/https:\/\/(cdn\.jsdelivr\.net|[^/]*huggingface)/.test(request.url()))
      requests.push(request.url());
  });
  await page.goto("/showcase/film?capture=1");
  await page.waitForFunction(() => !!window.__filmCapture);
  await page.evaluate(() => window.__filmCapture!.renderFrame(300));
  await expect(page.getByRole("slider", { name: "Playhead" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /VOICE|Play/ })).toHaveCount(0);
  await expect(page.getByText("Transcript", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-film-chapter]")).toBeVisible();
  expect(
    await page.evaluate(() => {
      const store = (window as unknown as { captureStorage: { reads: string[]; writes: string[] } })
        .captureStorage;
      return [...store.reads, ...store.writes].filter((key) => key.endsWith(":t"));
    }),
  ).toEqual([]);
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  expect(requests).toEqual([]);
  // Exercise the existing TanStack link while capture hides the shell's back link.
  await page.evaluate(() => {
    Object.assign(window, { captureNavigationMarker: true });
  });
  await page
    .locator('a[href="/"]')
    .first()
    .evaluate((link) => (link as HTMLAnchorElement).click());
  await expect(page.locator("[data-film-stage]")).toHaveCount(0);
  expect(await page.evaluate(() => !!window.__filmCapture)).toBe(false);
  expect(
    await page.evaluate(
      () => (window as unknown as { captureNavigationMarker: boolean }).captureNavigationMarker,
    ),
  ).toBe(true);
});

test("all Design shots commit the requested real scroll position", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.goto("/showcase/design?capture=1");
  await page.waitForFunction(() => !!window.__filmCapture);
  const receipts = [];
  for (let board = 0; board < 8; board++)
    for (const offset of [1, 5, 9]) {
      const frame = (board * 10 + offset) * 30;
      await page.evaluate((frame) => window.__filmCapture!.renderFrame(frame), frame);
      const receipt = await page.evaluate(() => {
        const board = document.querySelector<HTMLElement>("[data-shot-scroll]")!;
        const scroller = board.querySelector<HTMLElement>("[data-design-scroll]") ?? board;
        return {
          board: board.dataset.designBoard,
          top: scroller.scrollTop,
          height: scroller.scrollHeight,
          client: scroller.clientHeight,
          fraction: Number(board.dataset.shotScroll),
          canvases: Array.from(board.querySelectorAll("canvas")).map((canvas) => ({
            width: canvas.width,
            height: canvas.height,
          })),
        };
      });
      expect(
        Math.abs(receipt.top - (receipt.height - receipt.client) * receipt.fraction),
      ).toBeLessThanOrEqual(1);
      expect(receipt.fraction).toBe(offset === 1 ? 0 : offset === 5 ? 0.325 : 0.65);
      for (const canvas of receipt.canvases) {
        expect(canvas.width).toBeGreaterThan(0);
        expect(canvas.height).toBeGreaterThan(0);
      }
      receipts.push({ frame, ...receipt });
    }
  await testInfo.attach("directed-scroll.json", {
    body: JSON.stringify(receipts, null, 2),
    contentType: "application/json",
  });
});

test("capture-enabled assets refuse a non-loopback page origin", async ({ page, baseURL }) => {
  // Serve the exact local Vite assets through a browser route, preserving the
  // document's non-loopback origin without contacting an external host.
  await page.route("http://film-public.invalid/**", async (route) => {
    const requested = new URL(route.request().url());
    const response = await route.fetch({
      url: new URL(requested.pathname + requested.search, baseURL).href,
    });
    await route.fulfill({ response });
  });
  await page.goto("http://film-public.invalid/showcase/film?capture=1");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Playhead" })).toBeVisible();
  expect(await page.evaluate(() => !!window.__filmCapture)).toBe(false);
});

for (const film of ["abbey", "mega"])
  test(`${film}: closing title remains readable through the final frame`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/showcase/${film}?capture=1`);
    await page.waitForFunction(() => !!window.__filmCapture);
    const duration = await page.evaluate(() => window.__filmCapture!.duration);
    for (const frame of [(duration - 2) * 30, duration * 30 - 1]) {
      await page.evaluate((frame) => window.__filmCapture!.renderFrame(frame), frame);
      const closing = page.locator(`[data-film-closing="${film}"]`);
      await expect(closing).toBeVisible();
      const title = film === "abbey" ? "Abbey, Aviva and ABI" : "MLAI";
      await expect(closing.getByText(title, { exact: true })).toBeVisible();
      await expect(closing).toContainText(
        film === "abbey"
          ? "Discuss a scoped project and review the evidence."
          : "Infrastructure for resilient intelligence.",
      );
      const opacity = await closing.getByText(title, { exact: true }).evaluate((element) => {
        let effective = 1;
        for (let current: Element | null = element; current; current = current.parentElement)
          effective *= Number(getComputedStyle(current).opacity);
        return effective;
      });
      expect(opacity).toBeGreaterThanOrEqual(0.99);
      if (film === "mega")
        expect(
          await page
            .locator(".mlai-picture canvas")
            .first()
            .evaluate((canvas) => Number(getComputedStyle(canvas).opacity)),
        ).toBeLessThanOrEqual(0.17);
      await testInfo.attach(`${film}-closing-${frame}.png`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    }
  });

// Inject a suspended dependency into an otherwise real browser/React Stage.
// The unresolved promise remains held until the test explicitly releases it.
async function holdCaptureReadiness(
  page: import("@playwright/test").Page,
  kind: "fonts" | "image" | "required font",
) {
  await page.evaluate((kind) => {
    type Probe = {
      status: string;
      message?: string;
      entered: boolean;
      elapsed?: number;
      release(): void;
      oldAPI: NonNullable<Window["__filmCapture"]>;
      completion?: Promise<void>;
    };
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const probe: Probe = {
      status: "pending",
      entered: false,
      release,
      oldAPI: window.__filmCapture!,
    };
    Object.assign(window, { captureProbe: probe });
    if (kind === "fonts") {
      Object.defineProperty(document.fonts, "ready", {
        configurable: true,
        get() {
          probe.entered = true;
          return pending;
        },
      });
      probe.release = () => {
        delete (document.fonts as unknown as { ready?: unknown }).ready;
        release();
      };
    } else if (kind === "required font") {
      const load = document.fonts.load.bind(document.fonts);
      document.fonts.load = async (font, text) => {
        probe.entered = true;
        await pending;
        return load(font, text);
      };
      probe.release = () => {
        document.fonts.load = load;
        release();
      };
    } else {
      const img = document.createElement("img");
      img.style.display = "none";
      img.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>";
      Object.defineProperty(img, "complete", { configurable: true, get: () => false });
      img.decode = () => {
        probe.entered = true;
        return pending;
      };
      document.querySelector("[data-film-stage]")!.append(img);
      probe.release = () => {
        img.remove();
        release();
      };
    }
    const start = performance.now();
    probe.completion = probe.oldAPI.renderFrame(300).then(
      () => {
        probe.status = "resolved";
        probe.elapsed = performance.now() - start;
      },
      (error: Error) => {
        probe.status = "rejected";
        probe.message = error.message;
        probe.elapsed = performance.now() - start;
      },
    );
  }, kind);
  await page.waitForFunction(
    () => (window as unknown as { captureProbe: { entered: boolean } }).captureProbe.entered,
  );
}
const captureProbe = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const probe = (
      window as unknown as { captureProbe: { status: string; message?: string; elapsed?: number } }
    ).captureProbe;
    return { status: probe.status, message: probe.message, elapsed: probe.elapsed };
  });
const releaseCaptureProbe = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    (window as unknown as { captureProbe: { release(): void } }).captureProbe.release(),
  );

test("SPA teardown immediately rejects a suspended capture and its retired API", async ({
  page,
}, testInfo) => {
  await page.goto("/showcase/film?capture=1");
  await page.waitForFunction(() => !!window.__filmCapture);
  await holdCaptureReadiness(page, "fonts");
  expect(
    await page.evaluate(() =>
      window.__filmCapture!.renderFrame(301).catch((error: Error) => error.message),
    ),
  ).toContain("Concurrent");
  await page
    .locator('a[href="/"]')
    .first()
    .evaluate((link) => (link as HTMLAnchorElement).click());
  await expect(page.locator("[data-film-stage]")).toHaveCount(0);
  await expect.poll(async () => (await captureProbe(page)).status).toBe("rejected");
  const beforeRelease = await captureProbe(page);
  expect(beforeRelease.message).toContain("unmounted");
  expect(beforeRelease.elapsed).toBeLessThan(5000);
  expect(await page.evaluate(() => !!window.__filmCapture)).toBe(false);
  await releaseCaptureProbe(page);
  await page.waitForTimeout(50);
  expect(await captureProbe(page)).toEqual(beforeRelease);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { captureProbe: { oldAPI: NonNullable<Window["__filmCapture"]> } }
      ).captureProbe.oldAPI
        .renderFrame(301)
        .catch((error: Error) => error.message),
    ),
  ).toContain("unmounted");
  await testInfo.attach("capture-abort.json", {
    body: JSON.stringify(beforeRelease),
    contentType: "application/json",
  });
});

for (const kind of ["fonts", "image", "required font"] as const)
  test(`the shared deadline bounds suspended ${kind} and permits recovery`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(45000);
    await page.goto("/showcase/film?capture=1");
    await page.waitForFunction(() => !!window.__filmCapture);
    await holdCaptureReadiness(page, kind);
    await expect
      .poll(async () => (await captureProbe(page)).status, {
        timeout: 35000,
        intervals: [100, 500],
      })
      .toBe("rejected");
    const expired = await captureProbe(page);
    expect(expired.message).toContain(`timed out during ${kind}`);
    expect(expired.elapsed).toBeGreaterThanOrEqual(29900);
    expect(expired.elapsed).toBeLessThan(35000);
    await releaseCaptureProbe(page);
    await page.waitForTimeout(50);
    expect(await captureProbe(page)).toEqual(expired);
    expect(await page.evaluate(() => window.__filmCapture!.renderFrame(301))).toMatchObject({
      frame: 301,
      time: 301 / 30,
    });
    await testInfo.attach(`capture-${kind}-deadline.json`, {
      body: JSON.stringify(expired),
      contentType: "application/json",
    });
  });

test("closing a page releases an outstanding browser capture evaluation", async ({ page }) => {
  await page.goto("/showcase/film?capture=1");
  await page.waitForFunction(() => !!window.__filmCapture);
  await holdCaptureReadiness(page, "fonts");
  const pending = page
    .evaluate(async () => {
      await (window as unknown as { captureProbe: { completion: Promise<void> } }).captureProbe
        .completion;
    })
    .catch((error: Error) => error.message);
  await page.close();
  expect(await pending).toMatch(/closed|destroyed/i);
});

test("Mega audit stamp stays clear of qualifications throughout its visible interval", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.goto("/showcase/mega?capture=1");
  await page.waitForFunction(() => !!window.__filmCapture);
  const receipts = [];
  // Full interval at every output frame, including overshoot at entrance/exit.
  for (let frame = 4503; frame <= 4608; frame++) {
    await page.evaluate((frame) => window.__filmCapture!.renderFrame(frame), frame);
    const stamp = page.locator("[data-audit-stamp] div").last();
    if (!(await stamp.count())) continue;
    const bounds = await stamp.boundingBox();
    const caveat = await page
      .getByText("Pattern checks are not semantic safety.", { exact: true })
      .locator("..")
      .boundingBox();
    expect(bounds).not.toBeNull();
    expect(caveat).not.toBeNull();
    const overlap =
      bounds!.x < caveat!.x + caveat!.width &&
      bounds!.x + bounds!.width > caveat!.x &&
      bounds!.y < caveat!.y + caveat!.height &&
      bounds!.y + bounds!.height > caveat!.y;
    expect(
      overlap,
      `stamp intersects caveat at frame ${frame}: ${JSON.stringify({ bounds, caveat })}`,
    ).toBe(false);
    receipts.push({ frame, stamp: bounds, caveat });
    if ([4503, 4510, 4530, 4608].includes(frame))
      await testInfo.attach(`mega-audit-${frame}.png`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
  }
  expect(receipts.length).toBeGreaterThan(100);
  await testInfo.attach("audit-stamp-bounds.json", {
    body: JSON.stringify(receipts),
    contentType: "application/json",
  });
});

test("diagram scenes retain readable foreground over a restrained moving field", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  for (const [film, frames] of [
    ["mega", [1140, 3300, 4350, 4530, 4560, 7380]],
    ["explainer", [600, 1800, 1980, 2040, 2940]],
  ] as const) {
    await page.goto(`/showcase/${film}?capture=1`);
    await page.waitForFunction(() => !!window.__filmCapture);
    for (const frame of frames) {
      await page.evaluate((frame) => window.__filmCapture!.renderFrame(frame), frame);
      expect(
        await page
          .locator(".mlai-picture canvas")
          .first()
          .evaluate((canvas) => Number(getComputedStyle(canvas).opacity)),
      ).toBeLessThanOrEqual(0.16);
      await expect(page.locator("[data-film-chapter]")).toBeVisible();
      await testInfo.attach(`${film}-diagram-${frame}.png`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    }
  }
});

const localFontURL = /\.woff2?(?:\?|$)/;
const fontSnapshot = (page: import("@playwright/test").Page) =>
  page.evaluate(() => ({
    status: document.fonts.status,
    faces: [...document.fonts].map((face) => ({
      family: face.family,
      weight: face.weight,
      style: face.style,
      unicodeRange: face.unicodeRange,
      status: face.status,
    })),
  }));

test("failed required local fonts reject frame 600; a fresh context recovers", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const blocked: string[] = [];
  await page.route(localFontURL, (route) => {
    blocked.push(route.request().url());
    return route.abort("failed");
  });
  await page.goto("/showcase/explainer?capture=1");
  await page.waitForFunction(() => !!window.__filmCapture);
  const rejected = await page.evaluate(() =>
    window.__filmCapture!.renderFrame(600).then(
      (receipt) => ({ receipt, error: "" }),
      (error: Error) => ({ receipt: null, error: error.message }),
    ),
  );
  expect(rejected.receipt).toBeNull();
  expect(rejected.error).toContain("Required capture font failed:");
  const failed = await fontSnapshot(page);
  expect(blocked.length).toBeGreaterThan(0);
  expect(failed.status).toBe("loaded");
  expect(failed.faces.some((face) => face.status === "error")).toBe(true);
  await testInfo.attach("rejected-fallback-600.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  // Chromium retains failed FontFace objects. Removing the route cannot repair
  // this document; refuse again and require a fresh document/context.
  await page.unroute(localFontURL);
  const retry = await page.evaluate(() =>
    window.__filmCapture!.renderFrame(600).catch((error: Error) => error.message),
  );
  expect(retry).toEqual(rejected.error);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  try {
    const fresh = await context.newPage();
    await fresh.goto(`${baseURL}/showcase/explainer?capture=1`);
    await fresh.waitForFunction(() => !!window.__filmCapture);
    expect(await fresh.evaluate(() => window.__filmCapture!.renderFrame(600))).toMatchObject({
      frame: 600,
      time: 20,
    });
    await testInfo.attach("recovered-required-fonts-600.png", {
      body: await fresh.screenshot(),
      contentType: "image/png",
    });
    await testInfo.attach("required-font-failure.json", {
      body: JSON.stringify(
        { blocked, rejected, failed, retry, recovered: await fontSnapshot(fresh) },
        null,
        2,
      ),
      contentType: "application/json",
    });
  } finally {
    await context.close();
  }
});

test("required font frame 600 matches cold, revisit, fresh and delayed loads", async ({
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(120000);
  const receipts = [];
  let expected: string | undefined;
  for (const delay of [0, 0, 1500]) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      colorScheme: "dark",
    });
    try {
      const page = await context.newPage();
      const requests: string[] = [];
      let releaseFonts!: () => void;
      const fontGate = new Promise<void>((resolve) => {
        releaseFonts = resolve;
      });
      await page.route(localFontURL, async (route) => {
        requests.push(route.request().url());
        if (delay) await fontGate;
        await route.continue();
      });
      await page.addInitScript(() => {
        const load = document.fonts.load.bind(document.fonts);
        const loads: { font: string; text?: string; status: string }[] = [];
        Object.assign(window, { requiredFontLoads: loads });
        document.fonts.load = async (font, text) => {
          const entry = { font, text, status: "pending" };
          loads.push(entry);
          const faces = await load(font, text);
          entry.status = faces.every((face) => face.status === "loaded") ? "loaded" : "failed";
          return faces;
        };
      });
      // Begin capture while delayed font requests are outstanding, rather than
      // letting page.goto's default load event consume the delay first.
      await page.goto(`${baseURL}/showcase/explainer?capture=1`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !!window.__filmCapture);
      const statusBeforeCapture = await page.evaluate(() => document.fonts.status);
      if (delay) expect(statusBeforeCapture).toBe("loading");
      if (delay) setTimeout(releaseFonts, delay);
      for (const frame of [600, 1980, 600]) {
        const start = performance.now();
        const receipt = await page.evaluate(
          (frame) => window.__filmCapture!.renderFrame(frame),
          frame,
        );
        if (frame !== 600) continue;
        const png = await page.screenshot();
        const hash = createHash("sha256").update(png).digest("hex");
        if (expected) expect(hash).toBe(expected);
        else expected = hash;
        const title = await page.getByText("WDBX Runtime", { exact: true }).boundingBox();
        const loads = await page.evaluate(
          () =>
            (
              window as unknown as {
                requiredFontLoads: { font: string; text?: string; status: string }[];
              }
            ).requiredFontLoads,
        );
        expect(loads.length).toBeGreaterThan(0);
        expect(loads.every((load) => load.status === "loaded")).toBe(true);
        receipts.push({
          ...receipt,
          delay,
          statusBeforeCapture,
          hash,
          title,
          milliseconds: performance.now() - start,
          requests: [...requests],
          loads,
        });
        await testInfo.attach(`required-fonts-${receipts.length}-600.png`, {
          body: png,
          contentType: "image/png",
        });
      }
    } finally {
      await context.close();
    }
  }
  await testInfo.attach("required-font-hashes.json", {
    body: JSON.stringify(receipts, null, 2),
    contentType: "application/json",
  });
});

test("SPA teardown aborts the explicit required font load before late completion", async ({
  page,
}, testInfo) => {
  await page.goto("/showcase/explainer?capture=1");
  await page.waitForFunction(() => !!window.__filmCapture);
  await holdCaptureReadiness(page, "required font");
  await page
    .locator('a[href="/"]')
    .first()
    .evaluate((link) => (link as HTMLAnchorElement).click());
  await expect(page.locator("[data-film-stage]")).toHaveCount(0);
  await expect.poll(async () => (await captureProbe(page)).status).toBe("rejected");
  const result = await captureProbe(page);
  expect(result.message).toContain("unmounted during required font");
  expect(result.elapsed).toBeLessThan(5000);
  await releaseCaptureProbe(page);
  await page.waitForTimeout(50);
  expect(await captureProbe(page)).toEqual(result);
  expect(await page.evaluate(() => !!window.__filmCapture)).toBe(false);
  await testInfo.attach("required-font-abort.json", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
});

test("normal interactive playback retains fallback when local fonts fail", async ({ page }) => {
  await page.route(localFontURL, (route) => route.abort("failed"));
  await page.goto("/showcase/explainer");
  await expect(page.getByRole("button", { name: "Play without voice" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect((await fontSnapshot(page)).faces.some((face) => face.status === "error")).toBe(true);
  expect(await page.evaluate(() => !!window.__filmCapture)).toBe(false);
  await page.getByRole("button", { name: "Play without voice" }).click();
  await expect
    .poll(async () =>
      Number(await page.getByRole("slider", { name: "Playhead" }).getAttribute("aria-valuenow")),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Pause (space)" })).toBeVisible();
});

test("newly mounted Design boards validate used fonts without requiring an unused failed subset", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.goto("/showcase/design?capture=1");
  await page.waitForFunction(() => !!window.__filmCapture);
  await page.evaluate(async () => {
    const unused = new FontFace("Space Grotesk Variable", 'url("data:font/woff2;base64,AA==")', {
      unicodeRange: "U+10FFFF",
      weight: "300 700",
    });
    document.fonts.add(unused);
    await unused.load().catch(() => {});
    if (unused.status !== "error") throw new Error("Unused failure injection did not fail");
    const load = document.fonts.load.bind(document.fonts);
    const loads: {
      font: string;
      text?: string;
      faces: { family: string; weight: string; unicodeRange: string; status: string }[];
    }[] = [];
    Object.assign(window, { boardFontLoads: loads });
    document.fonts.load = async (font, text) => {
      const faces = await load(font, text);
      loads.push({
        font,
        text,
        faces: faces.map((face) => ({
          family: face.family,
          weight: face.weight,
          unicodeRange: face.unicodeRange,
          status: face.status,
        })),
      });
      return faces;
    };
  });
  const inventory = [];
  for (const frame of [150, 450, 750, 1050, 1350, 1650, 1950, 2250]) {
    const receipt = await page.evaluate((frame) => window.__filmCapture!.renderFrame(frame), frame);
    const fonts = await page.evaluate(() => {
      const loads = (
        window as unknown as {
          boardFontLoads: { font: string; text?: string; faces: { status: string }[] }[];
        }
      ).boardFontLoads;
      return loads.splice(0);
    });
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.flatMap((font) => font.faces).every((face) => face.status === "loaded")).toBe(
      true,
    );
    inventory.push({ ...receipt, fonts });
  }
  await testInfo.attach("design-required-fonts.json", {
    body: JSON.stringify(inventory, null, 2),
    contentType: "application/json",
  });
});
