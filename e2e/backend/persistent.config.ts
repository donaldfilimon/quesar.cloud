import { defineConfig } from "@playwright/test";
import { acceptanceTarget } from "./guard";
acceptanceTarget();
export default defineConfig({
  testDir: ".",
  testMatch: "persistent.acceptance.ts",
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  outputDir: "../../test-results/persistent-acceptance",
  reporter: "list",
  use: { browserName: "chromium", actionTimeout: 20_000, trace: "off", screenshot: "off" },
});
