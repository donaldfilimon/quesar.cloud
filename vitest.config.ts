import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// App unit tests (`npm run test:app`). scripts/*.test.mjs still run on
// node:test via `npm test` until phase 3 folds them in.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**"],
  },
});
