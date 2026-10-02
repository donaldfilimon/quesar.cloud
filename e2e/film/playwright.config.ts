import { defineConfig } from "@playwright/test";
import { createServer } from "node:net";
if (!process.env.FILM_TEST_PORT) {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("No film test port");
  process.env.FILM_TEST_PORT = String(address.port);
  await new Promise<void>((resolve) => probe.close(() => resolve()));
}
const baseURL = `http://127.0.0.1:${process.env.FILM_TEST_PORT}`;
export default defineConfig({
  testDir: "..",
  workers: 1,
  fullyParallel: false,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    cwd: process.cwd(),
    command: `VITE_FILM_CAPTURE=${process.env.FILM_CAPTURE_BUILD ?? "1"} VITE_STATIC_SITE=true VITE_AUTH_ENABLED=false BETTER_AUTH_URL=${baseURL} bunx vite dev --host 127.0.0.1 --port ${process.env.FILM_TEST_PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60000,
  },
  projects: [
    ...(process.env.FILM_CAPTURE_BUILD === "0"
      ? [
          {
            name: "capture-disabled",
            testMatch: "film/guard.acceptance.ts",
            use: { viewport: { width: 1920, height: 1080 } },
          },
        ]
      : []),
    {
      name: "capture",
      testMatch: "film/capture.acceptance.ts",
      use: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark" },
    },
    {
      name: "film-desktop",
      testMatch: "rooms.spec.ts",
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "film-mobile",
      testMatch: "rooms.spec.ts",
      use: { viewport: { width: 390, height: 844 } },
    },
    {
      name: "film-zoom",
      testMatch: "rooms.spec.ts",
      use: { viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 },
    },
  ],
});
