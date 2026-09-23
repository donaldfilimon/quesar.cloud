import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { isMigrationFile } from "./scripts/migration-plan.ts";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "quesar:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[quesar] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

// Dev server on :8080 (Better Auth trusts that origin; see AGENTS.md for
// running on another port).
export default defineConfig(({ command, isPreview, mode }) => {
  // `bun run build:static` (mode "static"): prerender every page to plain files
  // for GitHub Pages. No server exists there; see src/lib/static-site.ts.
  const isStatic = mode === "static";
  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port: 8081,
      strictPort: true,
    },
    resolve: { tsconfigPaths: true },
    plugins: [
      pgliteBootstrapPlugin(),
      tailwindcss(),
      tanstackStart(
        isStatic
          ? {
              prerender: {
                enabled: true,
                crawlLinks: true,
                autoSubfolderIndex: true,
                failOnError: true,
                // Server-only surfaces have nothing to prerender on a static host.
                filter: ({ path }) => !path.startsWith("/api/") && !path.startsWith("/_serverFn"),
              },

              pages: [
                { path: "/feed.xml" },
                { path: "/unauthorized" },
                { path: "/signup" },
                { path: "/404" },
              ],
            }
          : undefined,
      ),
      ...(isStatic
        ? // The prerenderer drives a local Nitro node server; only the HTML is published.
          [nitro({ preset: "node-server" })]
        : command === "build" || isPreview
          ? [
              nitro({
                preset: "vercel",
                // Vercel cron: expire conversation audits past their retention.
                // Vercel sends GET with `Authorization: Bearer $CRON_SECRET`; the
                // route answers 503 until CRON_SECRET is set.
                vercel: {
                  config: {
                    version: 3,
                    crons: [{ path: "/api/cron/audits-expire", schedule: "17 3 * * *" }],
                  },
                },
              }),
            ]
          : []),
      viteReact(),
    ],
  };
});
