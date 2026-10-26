import type { Plugin } from "vite";

/**
 * Browsers cache failed dynamic imports by URL. Keep Vite's normal dependency
 * preloading and chunk graph, but give each actual search import a fresh URL.
 * The app caches the successful promise, so this does not reload an open panel.
 */
export function searchRetryPlugin(): Plugin {
  return {
    name: "quesar:search-retry",
    apply: "build",
    renderChunk(code) {
      const output = code.replace(
        // The source import carries a webpack chunk-name comment for the Next.js build.
        /import\(\s*(?:\/\*[^*]*\*\/\s*)?(["'])(\.\/search-panel-[^"']+\.js)\1\s*\)/g,
        (_match, _quote, path: string) =>
          `import(new URL(${JSON.stringify(path)},import.meta.url).href+"?attempt="+Date.now()+"-"+Math.random())`,
      );
      return output === code ? null : { code: output, map: null };
    },
  };
}
