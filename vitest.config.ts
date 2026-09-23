import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// App unit tests (`npm run test:app`). The tests under scripts/ and
// src/lib/auth run on node:test via `npm test` until they move to vitest.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/lib/auth/**", "node_modules/**"],
  },
});
