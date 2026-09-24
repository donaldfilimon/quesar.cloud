import { test, expect } from "@playwright/test";

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
  await page.route("**/media/*.mp4", (route) => route.abort());
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
