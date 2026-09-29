import { test, expect } from "@playwright/test";

test("optional outages preserve repositories and retry restores all panels", async ({ page }) => {
  let unavailable = true;
  await page.route("https://api.github.com/**", (route) => {
    if (route.request().url().includes("/repos?"))
      return route.fulfill({
        json: [
          { name: "abi", html_url: "https://github.com/donaldfilimon/abi", stargazers_count: 42 },
        ],
      });
    return route.fulfill(unavailable ? { status: 503, body: "" } : { json: [] });
  });
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill(
      unavailable
        ? { status: 503, body: "" }
        : {
            body: "# Public repository\nVerified fixture excerpt for recovery.",
          },
    ),
  );
  await page.goto("/developers");
  await expect(
    page.getByText("Live repository metadata from donaldfilimon", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("42 stars", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry READMEs" }).first()).toBeVisible();
  unavailable = false;
  await page.getByRole("button", { name: "Retry READMEs" }).first().click();
  await expect(page.getByRole("button", { name: "Retry READMEs" })).toHaveCount(0);
  await expect(
    page.getByText("Verified fixture excerpt for recovery.", { exact: true }),
  ).toBeVisible();
});

test("total outage leaves curated source links and filters usable", async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.route("https://raw.githubusercontent.com/**", (route) => route.abort());
  await page.goto("/source");
  await expect(page.getByRole("button", { name: "Retry repository metadata" })).toBeVisible();
  await page.getByLabel("Filter repositories").fill("abi");
  await expect(
    page.getByRole("link").filter({ hasText: "donaldfilimon/abi" }).first(),
  ).toBeVisible();
});

test("total outage falls back to the build-time snapshot, labelled as such", async ({ page }) => {
  const { readdirSync } = await import("node:fs");
  test.skip(
    !readdirSync("docs/assets").some((name) => name.startsWith("github-snapshot-")),
    "this build had no network, so it carries no snapshot",
  );
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.route("https://raw.githubusercontent.com/**", (route) => route.abort());
  await page.goto("/developers");
  await expect(
    page.getByText("Showing READMEs captured when this site was built", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "abi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry READMEs" }).first()).toBeVisible();
});
