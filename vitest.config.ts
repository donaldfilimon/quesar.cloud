import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// App unit tests (`npm run test:app`). The Grok template's own tests under
// scripts/ and src/lib/{app-data,auth} run on node:test via `npm test`.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/lib/app-data/**", "src/lib/auth/**", "node_modules/**"],
  },
});
