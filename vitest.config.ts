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
  },
});
