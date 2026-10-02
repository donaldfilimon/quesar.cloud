import { test, expect } from "@playwright/test";
test("a normal build ignores a capture query and retains playback and saved position", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("mlai-film:t", "42"));
  await page.goto("/showcase/film?capture=1");
  await expect(page.getByRole("slider", { name: "Playhead" })).toHaveAttribute(
    "aria-valuenow",
    "42",
  );
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(await page.evaluate(() => !!window.__filmCapture)).toBe(false);
  await expect(page.locator("[data-capture=true]")).toHaveCount(0);
});
