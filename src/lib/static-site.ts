/**
 * Static-site build (GitHub Pages, `bun run build:static`). There is no server:
 * no server functions, no Better Auth, no database, no API routes. Surfaces that
 * need one render `ServerOnlyNotice` instead of calling it.
 */
export const staticSite = import.meta.env.VITE_STATIC_SITE === "true";
