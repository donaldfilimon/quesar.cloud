# Next.js App Router port

Requested by Donald on 2026-10-26 ("improve quesar.cloud website with modern next js and new styles"). Asked about `AGENTS.md`'s rule that this repo superseded the Next 16 `MLAI-CORPORATION-WWW` site and must not revive it, Donald chose to port to Next.js anyway. That retired checkout stays retired: this is a port of _this_ repository's source, not a revival of the old one. The "new styles" are the blueprint instrument redesign (`2026-10-25-blueprint-redesign.md`), finished and verified on `design/blueprint-instrument` first. The port branch `next/app-router-port` builds on it.

`AGENTS.md` and `CLAUDE.md` still describe TanStack Start as the framework. Update them in the change that makes Next.js the production build (stage 3), not before.

## Approach: strangler, not rewrite

The site is 74 TanStack file routes and about 64k lines of TypeScript, with Better Auth, server functions, PGLite, a static publish pipeline and a 226-case Playwright suite. A rewrite would freeze the site for weeks and lose that suite as a safety net. Instead, both builds run from one source tree:

- `app/` is the Next.js App Router tree. `scripts/next-routes.ts` generates one `page.tsx` (server: params, `generateStaticParams`) and one `view.tsx` (client: mounts the route) for each TanStack route, keyed by its `createFileRoute("…")` id. `--check` fails on drift, as `routeTree.gen.ts` would. Hand-written: `layout.tsx` (ported `__root.tsx`), `not-found.tsx`, and three force-static route handlers (`/feed.xml`, `/search-catalog.json`, `/github-snapshot.json`).
- `src/compat/next/` maps the TanStack surface this repo uses onto Next: `Link`, `useNavigate`, `useRouter`, `useRouterState`, `useHydrated`, `Navigate`, `notFound`, `redirect`, `Route.useParams/useSearch/useLoaderData`, `getRouteApi`, plus TanStack's search serialisation. `RouteView` runs the route's loader, merges its `head()` over the root defaults with TanStack's dedupe rule, and renders the tags, which React 19 hoists into `<head>`. `ssr: false` routes render after hydration.
- `next.config.ts` aliases `@tanstack/react-router` and `@tanstack/react-start` to the compat layer for webpack. Type checking still uses the real TanStack types (`tsconfig.next.json` includes `src/`, so `routeTree.gen.ts` registers the routes).

## Stages

1. **Static parity (this change).** `output: "export"`, webpack. URLs keep the live shape (`/docs`, no trailing slash); `scripts/next-export.ts` moves each `docs.html` to `docs/index.html` for GitHub Pages. Links preload on intent (hover/focus), as TanStack's `defaultPreload: "intent"` did, not on entering the viewport. The build is static-mode only (`VITE_STATIC_SITE=true`, auth off), which is what quesar.cloud serves today. Server-only modules (`*.server.ts`, `@/lib/db`, `@/lib/server/*`) are swapped for a throwing stub, and `createServerFn` returns a rejecting function, because the static build renders `ServerOnlyNotice` before any of them could run. Deferred: `/quasar/site/$id` (ids exist only at runtime). The GitHub build snapshot is a force-static route handler, `/github-snapshot.json`.
2. **Server runtime.** Port `createServerFn` modules to route handlers and server actions, Better Auth to `app/api/auth/[...all]/route.ts`, `src/routes/api/*` to route handlers, CSP headers from `src/start.ts` to middleware, the PGLite migrations glob to an explicit import. This drops the server stub and `output: "export"` for the Vercel build, and removes the webpack-only needs, so Turbopack can take over.
3. **Cut-over.** Make `next build` the `build`/`build:static` scripts, point `publish-static` at `out/`, rerun the full gate and e2e on the Next output, delete `vite.config.ts`, the TanStack packages, `routeTree.gen.ts` and the compat layer (route files become plain components), and update `AGENTS.md` and `CLAUDE.md`. Publishing (`quesar-static-publish`) waits for Donald's go-ahead.

## Acceptance for stage 1

- `bun run next:build` generates and statically exports every route except the deferred one.
- `bun run next:check`: every page in `docs/` exists in `out/` with an identical `<title>`, description and canonical URL, and every exported page renders the site shell.
- The Playwright suite passes against `out/` (`E2E_STATIC_ROOT=out bunx playwright test`) and still against `docs/`. Three test changes are build-agnostic: asset matchers accept both builds' file names (`search-panel-<hash>` and `search-panel.<hash>.js`), and alert assertions are scoped to `<main>`, because Next adds a page-level `role="alert"` route announcer.
- `bun run typecheck` (now including `tsconfig.next.json`) and `bun run lint` pass. The Vite build and its gate are unchanged.

## Not covered by stage 1

Server features (sign-in, console, admin, Quasar, inquiries, billing) behave as they do on the static site today: a notice, no network. JS budgets in `scripts/check-static.ts` measure Vite chunks and have no Next equivalent yet. Stage 3 sets them.
