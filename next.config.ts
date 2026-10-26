import { resolve } from "node:path";
import type { NextConfig } from "next";

/**
 * quesar.cloud on the Next.js App Router
 * (notes/superpowers/specs/2026-10-26-nextjs-app-router-port.md). Two modes:
 *
 * - static (`bun run build:static`): the export GitHub Pages serves from `docs/`.
 *   Server-only modules are stubbed and server functions refuse; pages show
 *   `ServerOnlyNotice` instead (src/lib/static-site.ts).
 * - server (`QUESAR_NEXT_MODE=server`: `bun run dev`, `build`, `start`): the full
 *   site. Server functions compile to an RPC client in the browser and a registry
 *   on the server (scripts/next-transform.ts); `src/routes` server routes become
 *   route handlers; `proxy.server.ts` runs readiness and CSP.
 *
 * Route modules live in `src/routes` and `scripts/next-routes.ts` generates `app/`
 * from them. Server-build-only files use a `.server.ts(x)` extension that only
 * server mode adds to `pageExtensions`, so the static export never sees them.
 * Builds run on webpack: the module rewrites above (server-function ids,
 * `import.meta.glob`, `import.meta.env`, per-bundle aliases) need webpack's loader
 * and plugin hooks.
 */
import { execFileSync } from "node:child_process";
import { assertPersistentBuildMode } from "./scripts/persistent-build-mode.ts";

const serverMode = process.env.QUESAR_NEXT_MODE === "server";
// The narrated-film capture (e2e/film) runs its own dev server beside any other build.
const distOverride = process.env.QUESAR_NEXT_DIST;
const persistent = process.env.QUESAR_NEXT_PERSISTENT === "true";
// A persistent (self-hosted) server must never inherit the static site's bypasses.
assertPersistentBuildMode(persistent ? "persistent" : "production", serverMode ? "false" : "true");

const framework = (file: string) => resolve(import.meta.dirname, "src/framework", file);

/** Server-only modules: never in browser bundles, and stubbed everywhere in static mode. */
const SERVER_ONLY = [/\.server(\.tsx?)?$/, /^@\/lib\/db(\.ts)?$/, /^@\/lib\/server\//];

const nextConfig: NextConfig = {
  ...(serverMode ? {} : { output: "export" as const }),
  pageExtensions: serverMode ? ["tsx", "ts", "server.tsx", "server.ts"] : ["tsx", "ts"],
  // URLs stay `/docs`, as on the live site; in static mode `scripts/next-export.ts`
  // then moves each `docs.html` to `docs/index.html` for GitHub Pages.
  trailingSlash: false,
  distDir: distOverride ?? (serverMode ? ".next-server" : ".next"),
  images: { unoptimized: true },
  reactStrictMode: true,
  // The source commit, not a random id: rebuilding unchanged source reproduces
  // docs/ byte for byte, so a republish diff shows only real changes.
  generateBuildId: () => {
    try {
      return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  },
  // Read at runtime by proxy.server.ts; fixed at build, as the Vite mode was.
  env: { QUESAR_NEXT_PERSISTENT: persistent ? "true" : "false" },
  // AGENTS.md is the owner's standing rules; `next dev` must not inject its own block.
  agentRules: false,
  // PGLite loads its wasm and data files from its package directory at runtime;
  // tracing must carry them into the deployment.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@electric-sql/pglite/dist/*.{wasm,data}"],
  },
  // `bun run typecheck` covers src/ and app/ with tsconfig.next.json; the build doesn't repeat it.
  typescript: { tsconfigPath: "tsconfig.next.json", ignoreBuildErrors: true },
  webpack(config, { webpack, dev, isServer }) {
    const realServer = serverMode && isServer;
    // Records written while the dev server runs (film receipts, notes, the published
    // site) are not inputs and must not trigger rebuilds.
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/notes/**",
          "**/.superpowers/**",
          "**/docs/**",
        ],
      };
    }
    if (serverMode) {
      config.module.rules.unshift(
        // `?raw` source imports (the migrations glob in src/lib/db.ts).
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
    // Per-bundle module swaps. These rewrite the request before resolution: an
    // `@/…` request is resolved through tsconfig paths, which `resolve.alias` cannot
    // intercept.
    const swap = (request: string, target: (issuerLayer: string | undefined) => string | null) =>
      new webpack.NormalModuleReplacementPlugin(
        new RegExp(`^${request.replace(/[/@]/g, "\\$&")}$`),
        (resource: { request: string; contextInfo?: { issuerLayer?: string } }) => {
          const file = target(resource.contextInfo?.issuerLayer);
          if (file) resource.request = framework(file);
        },
      );
    config.plugins.push(
      // `@/framework/server-fn` is the server implementation; browser bundles get the
      // RPC client and the static export the refusing stub.
      swap("@/framework/server-fn", () =>
        realServer ? null : serverMode ? "server-fn.client.ts" : "server-fn.static.ts",
      ),
      // Route handlers and the proxy run in react-server layers, where the
      // `"use client"` router is only a client reference.
      swap("@/framework/router", (layer) =>
        realServer && (layer === "rsc" || layer === "middleware") ? "router-server.ts" : null,
      ),
      // The server build fetches GitHub server-side; only the static export ships a snapshot.
      swap("@/framework/github-snapshot-url", () =>
        serverMode ? "github-snapshot-none.ts" : null,
      ),
      ...(realServer
        ? []
        : SERVER_ONLY.map(
            (pattern) =>
              new webpack.NormalModuleReplacementPlugin(pattern, framework("server-stub.ts")),
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
