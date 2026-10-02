import { expect, test } from "@playwright/test";

test("home client actions and service inquiry context work by keyboard", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("main section").first();
  await expect(hero.getByRole("link", { name: "Discuss your project" })).toHaveAttribute(
    "href",
    "/contact",
  );
  await expect(hero.getByRole("link", { name: "Explore the platform" })).toHaveAttribute(
    "href",
    "/platform",
  );
  await page.goto("/services");
  const inquiry = page.getByRole("link", { name: "Discuss this service" }).first();
  await inquiry.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Service or project context (optional)")).toHaveValue(
    "Autonomy Readiness Audit",
  );
  await page.getByLabel("Service or project context (optional)").fill("A narrower assessment");
  await page.getByLabel("Message", { exact: true }).fill("Keep my project requirements here.");
  await page.getByLabel("Name", { exact: true }).fill("Donald");
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Open email draft" }).click();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "Keep my project requirements here.",
  );
  await expect(page.getByLabel("Service or project context (optional)")).toHaveValue(
    "A narrower assessment",
  );
  await page.goto("/contact?service=Unknown");
  await expect(page.getByLabel("Service or project context (optional)")).toHaveValue("");
});

test("static drafts, accepted receipts and legacy copies keep their delivery labels", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const item = {
      id: "legacy",
      name: "Test",
      email: "test@example.com",
      topic: "Services",
      message: "Legacy inquiry content",
      created: 1,
    };
    localStorage.setItem(
      "mlai-inquiries",
      JSON.stringify([
        item,
        { ...item, id: "draft", delivery: "draft" },
        { ...item, id: "accepted", delivery: "accepted" },
      ]),
    );
  });
  await page.goto("/contact");
  await expect(page.getByText("Legacy copy — delivery unknown", { exact: false })).toBeVisible();
  await expect(
    page.getByText("Email draft — delivery unconfirmed", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Inquiry accepted by the site", { exact: false })).toBeVisible();
});

test("failed submission preserves the complete editable form", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Name", { exact: true }).fill("Donald");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  const message = "A".repeat(1999);
  await page.getByLabel("Message", { exact: true }).fill(message);
  await page.getByLabel("Service or project context (optional)").fill("Private AI Deployment");
  await page.getByRole("button", { name: "Open email draft" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Keep your service context and message under 2000 characters.",
  );
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Donald");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("test@example.com");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(message);
  await expect(page.getByLabel("Service or project context (optional)")).toHaveValue(
    "Private AI Deployment",
  );
});

test("services and contact stay discoverable in desktop and mobile navigation", async ({
  page,
}) => {
  await page.goto("/");
  if (page.viewportSize()!.width < 1024) {
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu.getByRole("link", { name: "Services", exact: true })).toBeVisible();
    const contact = menu.getByRole("link", { name: "Contact", exact: true });
    await contact.focus();
    await page.keyboard.press("Enter");
  } else {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Services", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "Contact", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Discuss your project.");
});

test("platform evidence table can be reached and scrolled by keyboard", async ({ page }) => {
  await page.goto("/platform");
  const region = page.getByRole("region", { name: "Scrollable data table" });
  await region.focus();
  await expect(region).toBeFocused();
  if (page.viewportSize()!.width < 1024) {
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
});
