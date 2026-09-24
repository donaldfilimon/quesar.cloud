import { test, expect } from "@playwright/test";

test("mobile menu releases focus and scroll when resized to desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("[role=dialog]")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation", { name: "Mobile" })
    .getByRole("link", { name: "Docs", exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.locator("[role=dialog]")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

for (const asset of ["search-panel", "search-catalog"]) {
  test(`failed ${asset} retries locally without losing the page`, async ({ page }) => {
    let fail = true;
    await page.route(`**/assets/${asset}-*`, (route) => (fail ? route.abort() : route.continue()));
    await page.goto("/");
    await page.getByRole("button", { name: "Search the site" }).click();
    await expect(page.getByText("Search could not load.")).toBeVisible();
    fail = false;
    await page.getByRole("button", { name: "Retry search" }).click();
    await expect(page.getByRole("combobox", { name: "Search pages" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Search the site" })).toBeFocused();
  });
}

test("shortcut leaves editable content alone and search supports keyboard navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.textContent = "Editable";
    document.querySelector("main")!.prepend(editor);
    editor.focus();
  });
  await page.keyboard.press("Control+k");
  await expect(page.locator("[role=dialog]")).toHaveCount(0);
  await page.getByRole("button", { name: "Search the site" }).focus();
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search pages" }).fill("runtime build");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/docs#ref-runtime$/);
});
