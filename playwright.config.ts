import { defineConfig } from "@playwright/test";
import { createServer } from "node:net";

// Pick a separate loopback port per invocation; workers inherit the chosen port.
if (!process.env.E2E_PORT) {
  const probe = createServer();
  await new Promise<void>((done) => probe.listen(0, "127.0.0.1", done));
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("No preview port");
  process.env.E2E_PORT = String(address.port);
  await new Promise<void>((done) => probe.close(() => done()));
}
const baseURL = `http://127.0.0.1:${process.env.E2E_PORT}`;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "node scripts/serve-static.ts", url: baseURL, reuseExistingServer: false },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "short-mobile", use: { viewport: { width: 375, height: 568 } } },
  ],
});
