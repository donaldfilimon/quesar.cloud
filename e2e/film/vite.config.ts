import { defineConfig, mergeConfig } from "vite";
import siteConfig from "../../vite.config";

// Qualification writes receipts while capture holds browser-local state. These
// are not application inputs and must not trigger HMR or a CSS rebuild.
export default defineConfig((environment) =>
  mergeConfig(siteConfig(environment), {
    cacheDir: `node_modules/.vite-film-${process.env.FILM_TEST_PORT}`,
    server: { watch: { ignored: ["**/notes/**", "**/.superpowers/**", "**/docs/**"] } },
  }),
);
