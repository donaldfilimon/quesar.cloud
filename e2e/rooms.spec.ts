import { filmCollection } from "../src/lib/mlai/categories/film-collection";
import { test, expect } from "@playwright/test";

// The narrated rooms used to freeze on a still frame under reduced motion.
// They now wait for Play, say why, and then run with motion effects off.
// "Play without voice" keeps the test off the network: the voice model only
// downloads when a viewer asks for it.
test("a room under reduced motion starts on Play and advances", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/showcase/film");
  await expect(
    page.getByText("Your system asks for reduced motion", { exact: false }),
  ).toBeVisible();
  const playhead = page.getByRole("slider", { name: "Playhead" });
  await expect(playhead).toHaveAttribute("aria-valuenow", "0");
  await page.getByRole("button", { name: "Play without voice" }).click();
  await expect
    .poll(async () => Number(await playhead.getAttribute("aria-valuenow")), { timeout: 5000 })
    .toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Pause (space)" })).toBeVisible();
});

test("the transcript carries the whole narration without starting playback", async ({ page }) => {
  await page.goto("/showcase/explainer");
  await page.getByText("Transcript", { exact: true }).click();
  await expect(page.locator("details[open]")).toContainText(
    filmCollection.find((film) => film.id === "explainer")!.cues[0].text,
  );
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("Space on the transcript toggle opens it without starting the film", async ({ page }) => {
  await page.goto("/showcase/film");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByText("Transcript", { exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("details")).toHaveAttribute("open", "");
  // Still on the start overlay: the press did not become Play.
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Playhead" })).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
});

test("a completed film holds its final frame and Play deliberately replays it", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("mlai-film:t", "68.75"));
  await page.goto("/showcase/film");
  const playhead = page.getByRole("slider", { name: "Playhead" });
  await page.getByRole("button", { name: "Play without voice" }).click();

  await expect(playhead).toHaveAttribute("aria-valuetext", "1:09.00");
  const replay = page.getByRole("button", { name: "Play (space)", exact: true });
  await expect(replay).toBeVisible();
  const next = page.getByRole("navigation", { name: "Explore after the film" });
  await expect(next.getByRole("link", { name: "Meet Abbey" })).toHaveAttribute("href", "/abbey");
  await expect(next.getByRole("link", { name: "Build with MLAI" })).toHaveAttribute(
    "href",
    "/developers",
  );

  const wordmark = page.locator(".mlai-picture").getByText("MLAI", { exact: true });
  const opacity = await wordmark.evaluate((element) => {
    let result = 1;
    let node: Element | null = element;
    while (node) {
      result *= Number(getComputedStyle(node).opacity);
      node = node.parentElement;
    }
    return result;
  });
  expect(opacity).toBeGreaterThan(0.9);

  // The completed links take room from the picture. Measure the actual host
  // under a short landscape/zoom viewport, then restore this project's size.
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 720, height: 450 });
  await expect
    .poll(() =>
      page.locator(".mlai-picture-host").evaluate((host) => {
        const container = host.getBoundingClientRect();
        const picture = host.querySelector(".mlai-picture")!.getBoundingClientRect();
        return (
          picture.top >= container.top - 1 &&
          picture.bottom <= container.bottom + 1 &&
          picture.left >= container.left - 1 &&
          picture.right <= container.right + 1
        );
      }),
    )
    .toBe(true);
  await page.setViewportSize(viewport);

  // Activate Play with the pointer still previewing a different frame. Replay
  // must clear that preview as well as reset the completed clock.
  await replay.focus();
  const track = await playhead.boundingBox();
  if (!track) throw new Error("Missing playhead track");
  await page.mouse.move(track.x + track.width * 0.6, track.y + track.height / 2);
  await expect(playhead).toHaveAttribute("aria-valuenow", "41");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Pause (space)", exact: true })).toBeVisible();
  await expect
    .poll(async () => Number(await playhead.getAttribute("aria-valuenow")), { timeout: 5000 })
    .toBeLessThan(4);
  await expect
    .poll(async () => Number(await playhead.getAttribute("aria-valuenow")), { timeout: 5000 })
    .toBeGreaterThan(0);
});

test("Play without voice replays a film restored at its end", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mlai-film:t", "69"));
  await page.goto("/showcase/film");
  const playhead = page.getByRole("slider", { name: "Playhead" });
  await expect(playhead).toHaveAttribute("aria-valuetext", "1:09.00");
  await page.getByRole("button", { name: "Play without voice" }).click();
  await expect(page.getByRole("button", { name: "Pause (space)", exact: true })).toBeVisible();
  await expect
    .poll(async () => Number(await playhead.getAttribute("aria-valuenow")), { timeout: 5000 })
    .toBeLessThan(4);
  await expect
    .poll(async () => Number(await playhead.getAttribute("aria-valuenow")), { timeout: 5000 })
    .toBeGreaterThan(0);
});

test("Return to start clears a preview while the pointer remains on the scrubber", async ({
  page,
}) => {
  await page.goto("/showcase/film");
  await page.getByRole("button", { name: "Play without voice" }).click();
  await page.getByRole("button", { name: "Pause (space)", exact: true }).click();
  const playhead = page.getByRole("slider", { name: "Playhead" });
  await page.getByRole("button", { name: "Return to start (0)", exact: true }).focus();
  const track = await playhead.boundingBox();
  if (!track) throw new Error("Missing playhead track");
  await page.mouse.move(track.x + track.width * 0.6, track.y + track.height / 2);
  await expect(playhead).toHaveAttribute("aria-valuenow", "41");

  await page.keyboard.press("Enter");
  await expect(playhead).toHaveAttribute("aria-valuetext", "0:00.00");
  await expect(page.getByRole("button", { name: "Play (space)", exact: true })).toBeVisible();
});

for (const film of filmCollection) {
  test(`${film.id}: complete silent lifecycle, keyboard transcript and navigation cleanup`, async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.addInitScript(() => {
      const original = window.requestAnimationFrame.bind(window);
      const cancel = window.cancelAnimationFrame.bind(window);
      const pending = new Set<number>();
      window.requestAnimationFrame = (callback) => {
        const id = original((time) => {
          pending.delete(id);
          callback(time);
        });
        pending.add(id);
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        pending.delete(id);
        cancel(id);
      };
      Object.assign(window, { filmPendingFrames: pending });
    });
    let voiceRequests = 0;
    await page.route(/cdn\.jsdelivr\.net|huggingface\.co/, (route) => {
      voiceRequests++;
      return route.abort();
    });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto(`/showcase/${film.id}`);
    const slider = page.getByRole("slider", { name: "Playhead" });
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    const transcript = page.getByText("Transcript", { exact: true });
    await transcript.focus();
    await page.keyboard.press("Space");
    await expect(page.locator("details[open] ol li")).toHaveCount(film.cues.length);
    for (const cue of film.cues)
      await expect(page.locator("details[open]")).toContainText(cue.text);
    await page.keyboard.press("Space");
    expect(voiceRequests).toBe(0);
    await page.getByRole("button", { name: "Play without voice", exact: true }).click();
    await expect
      .poll(async () => Number(await slider.getAttribute("aria-valuenow")))
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Pause (space)", exact: true }).click();
    const paused = await slider.getAttribute("aria-valuetext");
    await page.waitForTimeout(180);
    await expect(slider).toHaveAttribute("aria-valuetext", paused!);
    await slider.focus();
    await page.keyboard.press("Shift+ArrowRight");
    await expect(slider).not.toHaveAttribute("aria-valuetext", paused!);
    await page.getByRole("button", { name: "Play (space)", exact: true }).click();
    // Browser visibility event, with document.hidden controlled because headless
    // Chromium does not background tabs when a second page comes to the front.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByRole("button", { name: "Play (space)", exact: true })).toBeVisible();
    await page.evaluate(() => {
      delete (document as { hidden?: boolean }).hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByRole("button", { name: "Play (space)", exact: true })).toBeVisible();
    await slider.focus();
    await page.keyboard.press("End");
    await expect(slider).toHaveAttribute("aria-valuenow", String(film.duration));
    if (film.id === "abbey" || film.id === "mega") {
      const closing = page.locator(`[data-film-closing="${film.id}"]`);
      await expect(
        closing.getByText(film.id === "abbey" ? film.title : "MLAI", { exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Play (space)", exact: true }).click();
    await expect
      .poll(async () => Number(await slider.getAttribute("aria-valuenow")))
      .toBeLessThan(4);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await expect(page.locator(".mlai-picture")).toBeVisible();
    expect(voiceRequests).toBe(0);
    await page.getByRole("link", { name: "SHOWCASE", exact: true }).click();
    await expect(page.locator("[data-film-stage]")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { filmPendingFrames: Set<number> }).filmPendingFrames.size,
        ),
      )
      .toBe(0);
    expect(voiceRequests).toBe(0);
  });

  test(`${film.id}: voice is explicit and a failed loader leaves usable captions`, async ({
    page,
  }) => {
    test.setTimeout(45000);
    let requested = 0;
    await page.route(/cdn\.jsdelivr\.net\/npm\/kokoro-js/, async (route) => {
      requested++;
      await route.fulfill({
        contentType: "application/javascript",
        body: 'throw new Error("Deliberate browser acceptance voice failure");',
      });
    });
    await page.goto(`/showcase/${film.id}`);
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    expect(requested).toBe(0);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect.poll(() => requested).toBeGreaterThan(0);
    await expect
      .poll(
        async () =>
          Number(
            await page.getByRole("slider", { name: "Playhead" }).getAttribute("aria-valuenow"),
          ),
        { timeout: 25000 },
      )
      .toBeGreaterThan(0);
    const voice = page.getByRole("button", { name: /VOICE ON/ });
    await voice.click();
    await expect(page.getByRole("button", { name: /VOICE OFF/ })).toBeVisible();
    await page.getByRole("button", { name: /VOICE OFF/ }).click();
    await expect(page.getByRole("button", { name: /VOICE ON/ })).toBeVisible();
    await page.getByText("Transcript", { exact: true }).click();
    await expect(page.locator("details[open]")).toContainText(film.cues[0].text);
    await page.getByRole("link", { name: "SHOWCASE", exact: true }).click();
    await expect(page.locator("[data-film-stage]")).toHaveCount(0);
  });
}

test("Design walkthrough seeks across all eight real boards and preserves Explore", async ({
  page,
}) => {
  await page.goto("/showcase/design");
  await page.getByRole("button", { name: "Play without voice", exact: true }).click();
  await page.getByRole("button", { name: "Pause (space)", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Playhead" });
  for (const board of [
    "brand",
    "system",
    "showcase",
    "hero",
    "lab",
    "marketing",
    "console",
    "docs",
  ]) {
    await expect(page.locator(`[data-design-board="${board}"]`)).toBeVisible();
    await slider.focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press("Shift+ArrowRight");
  }
  await page.getByRole("button", { name: "Explore boards", exact: true }).click();
  await expect(page.getByRole("button", { name: "Brand", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lab", exact: true }).click();
  await expect(page.locator('[data-design-board="lab"]')).toBeVisible();
  await page.getByRole("button", { name: "Back to walkthrough", exact: true }).click();
  await expect(slider).toBeVisible();
});
