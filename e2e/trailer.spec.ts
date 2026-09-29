import { test, expect, type Page } from "@playwright/test";

/**
 * Synthetic media events are only seen once React has attached its handlers,
 * and the static build hydrates after `load`. React tags hydrated nodes with a
 * `__reactProps$<id>` key, so wait for that on the <video> before dispatching.
 */
async function waitForHydratedVideo(page: Page) {
  await page.waitForFunction(() => {
    const video = document.querySelector("video");
    return Boolean(video && Object.keys(video).some((key) => key.startsWith("__reactProps$")));
  });
}

test("rejected playback stays paused and can be retried", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.reject(new DOMException("Playback blocked", "NotAllowedError"));
    };
  });
  await page.goto("/showcase");
  await page.getByRole("button", { name: "Play trailer" }).click();
  await expect(page.getByRole("alert")).toContainText("Playback could not start.");
  await expect(page.getByRole("button", { name: "Play trailer" })).toBeVisible();
  await page.evaluate(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    };
  });
  await page.getByRole("button", { name: "Retry playback" }).click();
  await expect(page.getByRole("button", { name: "Pause trailer" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("manual chapter selection cancels pending advancement and guards seeking", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    };
  });
  await page.goto("/showcase");
  await waitForHydratedVideo(page);
  await page.locator("video").dispatchEvent("ended");
  await expect(page.getByRole("button", { name: "2. The wafer" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await page.getByRole("button", { name: "3. The board" }).click();
  await page.locator("video").dispatchEvent("loadeddata");
  await expect(page.getByRole("button", { name: "Play trailer" })).toBeVisible();
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "duration", { configurable: true, value: Infinity });
    video.dispatchEvent(new Event("durationchange"));
  });
  await expect(page.getByRole("slider", { name: "Seek" })).toBeDisabled();
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "duration", { configurable: true, value: 60 });
    video.dispatchEvent(new Event("durationchange"));
  });
  await expect(page.getByRole("slider", { name: "Seek" })).toBeEnabled();
});

test("media failure disables seek and keeps chapter selection usable", async ({ page }) => {
  await page.route(/\/media\/.*\.(mp4|webm)$/, (route) => route.abort());
  await page.goto("/showcase");
  await expect(page.getByRole("alert")).toContainText("This film could not load.");
  await expect(page.getByRole("slider", { name: "Seek" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Retry playback" })).toBeVisible();
  await page.getByRole("button", { name: "2. The wafer" }).click();
  await expect(page.getByRole("button", { name: "2. The wafer" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.locator("track")).toHaveAttribute("src", "/media/wafer.vtt");
});

test("old playback rejection cannot overwrite a newly selected chapter", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return new Promise((_resolve, reject) => {
        (window as unknown as { rejectOld: () => void }).rejectOld = () =>
          reject(new Error("old request"));
      });
    };
  });
  await page.goto("/showcase");
  await page.getByRole("button", { name: "Play trailer" }).click();
  await page.getByRole("button", { name: "2. The wafer" }).click();
  await page.evaluate(() => (window as unknown as { rejectOld: () => void }).rejectOld());
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play trailer" })).toBeVisible();
});

test("chapter advancement plays the next film and completion returns to paused", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    };
  });
  await page.goto("/showcase");
  await waitForHydratedVideo(page);
  await page.locator("video").dispatchEvent("ended");
  await expect(page.getByRole("button", { name: "2. The wafer" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await page.locator("video").dispatchEvent("loadeddata");
  await expect(page.getByRole("button", { name: "Pause trailer" })).toBeVisible();
  await page.getByRole("button", { name: "3. The board" }).click();
  await page.locator("video").dispatchEvent("ended");
  await expect(page.getByRole("button", { name: "Play trailer" })).toBeVisible();
});

test("descriptions toggle, and mute only where a cut has sound", async ({ page }) => {
  await page.goto("/showcase");
  await waitForHydratedVideo(page);
  const toggle = page.getByRole("button", { name: "Show descriptions" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  // The mark is silent: no mute control that would do nothing.
  await expect(page.getByRole("button", { name: "Mute trailer" })).toHaveCount(0);
  await page.getByRole("button", { name: "2. The wafer" }).click();
  await expect(page.getByRole("button", { name: "Mute trailer" })).toBeVisible();
  await expect(page.locator("video source").first()).toHaveAttribute(
    "src",
    "/media/atmosphere-wafer.webm",
  );
  await expect(page.locator("track")).toHaveAttribute("kind", "descriptions");
});
