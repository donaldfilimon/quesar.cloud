import { resolve } from "node:path";
import type { NextConfig } from "next";

/**
 * Next.js App Router build of quesar.cloud, stage 1 of the port
 * (notes/superpowers/specs/2026-10-26-nextjs-app-router-port.md): a static export
 * that renders the same `src/routes` and components as the Vite build, through the
 * TanStack compat layer in `src/compat/next`. It runs on webpack because stage 1
 * rewrites `virtual:` imports, stubs server-only modules and defines
 * `import.meta.env`, none of which Turbopack can do yet.
 */
const compat = (file: string) => resolve(import.meta.dirname, "src/compat/next", file);

/** Server-only modules: reachable only from server-function handlers, which stage 1 never runs. */
const SERVER_ONLY = [/\.server(\.tsx?)?$/, /^@\/lib\/db(\.ts)?$/, /^@\/lib\/server\//];

const nextConfig: NextConfig = {
  output: "export",
  // URLs stay `/docs`, as on the live site; `scripts/next-export.ts` then moves each
  // `docs.html` to `docs/index.html`, the layout `docs/` already serves on GitHub Pages.
  trailingSlash: false,
  distDir: ".next",
  images: { unoptimized: true },
  reactStrictMode: true,
  // `bun run typecheck` covers src/ and app/ with tsconfig.next.json; the build doesn't repeat it.
  typescript: { tsconfigPath: "tsconfig.next.json", ignoreBuildErrors: true },
  webpack(config, { webpack, dev }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tanstack/react-router$": compat("router.tsx"),
      "@tanstack/react-start$": compat("start.ts"),
      "@tanstack/react-start/server$": compat("start.ts"),
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^virtual:search-catalog-url$/,
        compat("search-catalog-url.ts"),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /^virtual:github-snapshot-url$/,
        compat("github-snapshot-url.ts"),
      ),
      ...SERVER_ONLY.map(
        (pattern) => new webpack.NormalModuleReplacementPlugin(pattern, compat("server-stub.ts")),
      ),
      new webpack.DefinePlugin({
        "import.meta.env.VITE_STATIC_SITE": JSON.stringify("true"),
        "import.meta.env.VITE_AUTH_ENABLED": JSON.stringify("false"),
        "import.meta.env.VITE_FILM_CAPTURE": JSON.stringify(""),
        "import.meta.env.MODE": JSON.stringify("static"),
        "import.meta.env.DEV": JSON.stringify(dev),
      }),
    );
    return config;
  },
};

export default nextConfig;
