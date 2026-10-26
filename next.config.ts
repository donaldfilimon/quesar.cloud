import { resolve } from "node:path";
import type { NextConfig } from "next";

/**
 * Next.js App Router build of quesar.cloud
 * (notes/superpowers/specs/2026-10-26-nextjs-app-router-port.md). Two modes:
 *
 * - static (default, `bun run next:build`): a static export that renders the same
 *   `src/routes` as the Vite static build, through the TanStack compat layer in
 *   `src/compat/next`. Server-only modules are stubbed; server functions reject.
 * - server (`QUESAR_NEXT_MODE=server`, `bun run next:build:server`): the full site.
 *   Server functions compile to an RPC client in the browser and a registry on the
 *   server (scripts/next-transform.ts); TanStack server routes become route
 *   handlers; `proxy.server.ts` runs readiness and CSP.
 *
 * Server-build-only files use a `.server.ts(x)` extension that only this mode
 * adds to `pageExtensions`, so the static export never sees them. It runs on
 * webpack, because both modes rewrite modules (loaders, `virtual:` imports,
 * `import.meta.env`) in ways Turbopack cannot yet.
 */
const serverMode = process.env.QUESAR_NEXT_MODE === "server";
const persistent = process.env.QUESAR_NEXT_PERSISTENT === "true";
const compat = (file: string) => resolve(import.meta.dirname, "src/compat/next", file);

/** Server-only modules: never in browser bundles, and stubbed everywhere in static mode. */
const SERVER_ONLY = [/\.server(\.tsx?)?$/, /^@\/lib\/db(\.ts)?$/, /^@\/lib\/server\//];

const nextConfig: NextConfig = {
  ...(serverMode ? {} : { output: "export" as const }),
  pageExtensions: serverMode ? ["tsx", "ts", "server.tsx", "server.ts"] : ["tsx", "ts"],
  // URLs stay `/docs`, as on the live site; in static mode `scripts/next-export.ts`
  // then moves each `docs.html` to `docs/index.html` for GitHub Pages.
  trailingSlash: false,
  distDir: serverMode ? ".next-server" : ".next",
  images: { unoptimized: true },
  reactStrictMode: true,
  // AGENTS.md is the owner's standing rules; `next dev` must not inject its own block.
  agentRules: false,
  // PGLite loads its wasm and data files from its package directory at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  // `bun run typecheck` covers src/ and app/ with tsconfig.next.json; the build doesn't repeat it.
  typescript: { tsconfigPath: "tsconfig.next.json", ignoreBuildErrors: true },
  webpack(config, { webpack, dev, isServer }) {
    const realServer = serverMode && isServer;
    const start = !serverMode ? "start.ts" : isServer ? "start-server.ts" : "start-client.ts";
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tanstack/react-router$": compat("router.tsx"),
      "@tanstack/react-start$": compat(start),
      "@tanstack/react-start/server$": compat(realServer ? "start-server.ts" : "start.ts"),
    };
    if (serverMode) {
      config.module.rules.unshift(
        // Route handlers and the proxy run in react-server layers, where the
        // `"use client"` router is only a client reference.
        {
          issuerLayer: { or: ["rsc", "middleware"] },
          resolve: { alias: { "@tanstack/react-router$": compat("router-server.ts") } },
        },
        // Vite's `?raw` (the migrations glob in src/lib/db.ts).
        { resourceQuery: /raw/, type: "asset/source" },
        {
          test: /\.tsx?$/,
          include: [resolve(import.meta.dirname, "src")],
          enforce: "pre",
          use: [
            {
              loader: resolve(import.meta.dirname, "scripts/next-transform-loader.ts"),
              options: { target: isServer ? "server" : "client" },
            },
          ],
        },
      );
    }
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^virtual:search-catalog-url$/,
        compat("search-catalog-url.ts"),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /^virtual:github-snapshot-url$/,
        // The server build fetches GitHub server-side, as the Vite server build does.
        compat(serverMode ? "github-snapshot-none.ts" : "github-snapshot-url.ts"),
      ),
      ...(realServer
        ? []
        : SERVER_ONLY.map(
            (pattern) =>
              new webpack.NormalModuleReplacementPlugin(pattern, compat("server-stub.ts")),
          )),
      new webpack.DefinePlugin({
        "import.meta.env.VITE_STATIC_SITE": JSON.stringify(serverMode ? "false" : "true"),
        "import.meta.env.VITE_AUTH_ENABLED": JSON.stringify(
          serverMode ? (process.env.VITE_AUTH_ENABLED ?? "true") : "false",
        ),
        "import.meta.env.VITE_FILM_CAPTURE": JSON.stringify(process.env.VITE_FILM_CAPTURE ?? ""),
        "import.meta.env.MODE": JSON.stringify(
          !serverMode ? "static" : persistent ? "persistent" : dev ? "development" : "production",
        ),
        "import.meta.env.DEV": JSON.stringify(dev),
      }),
    );
    return config;
  },
};

export default nextConfig;
