import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The one test runner (`bun run test`): app code under src/ and the build
// scripts under scripts/. Runs on Node, never the Bun runtime.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    exclude: ["node_modules/**"],
    // The pre-push hook runs this suite on a shared desktop that is often
    // saturated by other builds. Bound the workers so the suite does not also
    // contend with itself, and give the first DB touch in a file headroom:
    // console.server.test.ts takes 3ms alone but >5s under a load of ~100.
    maxWorkers: 4,
    testTimeout: 20_000,
  },
});
