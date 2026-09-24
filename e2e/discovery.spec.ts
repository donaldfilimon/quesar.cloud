import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.fulfill({ json: [] }));
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({ status: 503, body: "" }),
  );
});

test("search filters, clears, and navigates to a reference anchor", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search the site" }).click();
  const input = page.getByRole("combobox", { name: "Search pages" });
  await expect(input).toBeFocused();
  await input.fill("runtime build");
  await page.getByLabel("Category", { exact: true }).selectOption("docs");
  await expect(input).toHaveValue("runtime build");
  await page.getByRole("option", { name: /Runtime build/ }).click();
  await expect(page).toHaveURL(/\/docs#ref-runtime$/);
  await expect(page.locator("#ref-runtime")).toBeInViewport();
  await page.getByRole("button", { name: "Search the site" }).click();
  await input.fill("zzzznothing");
  await expect(page.getByText("No pages match that query.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(input).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Search the site" })).toBeFocused();
});

test("search retains architecture query and external source semantics", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search the site" }).click();
  const input = page.getByRole("combobox", { name: "Search pages" });
  await input.fill("ABI");
  await page.getByLabel("Category", { exact: true }).selectOption("site");
  await page.getByRole("option").filter({ hasText: "Architecture" }).first().click();
  await expect(page).toHaveURL(/\/architecture\?node=/);
  await page.getByRole("button", { name: "Search the site" }).click();
  await input.fill("quesar.cloud");
  await page.getByLabel("Category", { exact: true }).selectOption("source");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("option").filter({ hasText: "quesar.cloud" }).first().click();
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toContain("github.com/donaldfilimon/quesar.cloud");
  await popup.close();
});
