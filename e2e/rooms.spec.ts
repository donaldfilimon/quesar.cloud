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
  await expect(page.getByText("Abbey, for verified answers.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});
