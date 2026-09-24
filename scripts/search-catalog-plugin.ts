import { createJiti } from "jiti";
import { resolve } from "node:path";
import type { Plugin } from "vite";

/** Generate retryable data from the typed content, never a second inventory. */
export function searchCatalogPlugin(): Plugin {
  let root = "";
  let dev = false;
  const id = "\0quesar:search-catalog-url";
  async function catalog() {
    const jiti = createJiti(import.meta.url, {
      alias: { "@": resolve(root, "src") },
      moduleCache: false,
    });
    const module = await jiti.import<{ searchCatalog: unknown }>(
      resolve(root, "src/lib/site-search-catalog.ts"),
    );
    return JSON.stringify(module.searchCatalog);
  }
  return {
    name: "quesar:search-catalog",
    configResolved(config) {
      root = config.root;
      dev = config.command === "serve";
    },
    resolveId(source) {
      if (source === "virtual:search-catalog-url") return id;
    },
    async load(source) {
      if (source !== id) return;
      if (dev) return 'export default "/__search-catalog.json";';
      const ref = this.emitFile({
        type: "asset",
        name: "search-catalog.json",
        source: await catalog(),
      });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
    configureServer(server) {
      server.middlewares.use("/__search-catalog.json", (_req, res, next) => {
        void catalog()
          .then((data) => {
            res.setHeader("Content-Type", "application/json");
            res.end(data);
          })
          .catch(next);
      });
    },
  };
}
