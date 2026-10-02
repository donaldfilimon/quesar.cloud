import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.fulfill({ json: [] }));
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({
      body: "# Repository\nPublic repository fixture.",
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const theme of ["light", "dark"] as const) {
  for (const route of [
    "/",
    "/docs",
    "/research",
    "/developers",
    "/showcase",
    "/services",
    "/contact",
    "/platform",
    "/products",
    "/apps",
    "/company",
  ]) {
    test(`${theme} accessibility and layout: ${route}`, async ({ page }, testInfo) => {
      await page.addInitScript((theme) => localStorage.setItem("mlai-theme", theme), theme);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        )
        .toBe(true);
      if (route === "/contact") {
        const submit = page.getByRole("button", { name: "Open email draft" });
        await expect(submit).toBeEnabled();
        await submit.hover();
      }
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        result.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
      ).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath("page.png"), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
  test(`${theme} search dialog accessibility and keyboard focus`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("mlai-theme", theme), theme);
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await page.getByRole("button", { name: "Search the site" }).click();
    await expect(page.getByRole("combobox", { name: "Search pages" })).toBeFocused();
    const result = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
    expect(
      result.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
    ).toEqual([]);
    const dialog = page.getByRole("dialog");
    const box = await dialog.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Search the site" })).toBeFocused();
  });
}

test("search and cinematic modules stay off the initial home request path", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.goto("/");
  expect(
    requested.filter((url) => /\/(search-panel|search-catalog|CinematicShell)-/.test(url)),
  ).toEqual([]);
  await page.getByRole("button", { name: "Search the site" }).click();
  await expect(page.getByRole("combobox", { name: "Search pages" })).toBeVisible();
  expect(requested.some((url) => /\/search-panel-/.test(url))).toBe(true);
});
