# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Which instruction file is which

- **`AGENTS.md` is Donald's standing rules for this repo. Read it before any edit.** It holds the merge-from-mlai deviations (own OAuth workspace connectors, admin rule, AES-GCM sealing, account deletion, static build) and the env-var table. This file only points at them.
- **This is no longer a Grok App Builder project (2026-09-23).** The sandbox contract, platform chrome and sandbox tooling were removed; never export from Grok into this repo again. The staged modernization plan (auth rebuild, bun + TS, design) is `notes/superpowers/specs/2026-09-23-quesar-modernization-design.md`.
- This is the main MLAI/Quesar site. `~/dev/active/mlai` is a read-only port source; don't build site work there.

## Commands

bun is the package manager (`bun.lock`; there is no `package-lock.json`). The tools themselves run on Node (>= 24): use `bun run <script>`, never `bun --bun`, and never bare `bun test` (that is Bun's own runner, not vitest).

```bash
bun install          # --frozen-lockfile in CI and on Vercel (vercel.json)
bun run dev          # 0.0.0.0:8080, strictPort
bun run typecheck    # tsc --noEmit over src/, scripts/ and the vite/vitest/eslint configs
bun run lint         # eslint 10 + react-hooks 7 (React Compiler rules), --max-warnings 0
bun run test         # vitest: src/**/*.test.{ts,tsx} and scripts/**/*.test.ts
bun run build        # vite build (Vercel preset) + PGLite assets + migrations
bun run build:static # GitHub Pages build into docs/
bun run check        # the gate: format:check, typecheck, lint, test, build (stops at first failure)
bun run format       # prettier --write . (.prettierignore skips docs/, notes/, sidecars/, native/, public/)
```

- **Gate:** `bun run check`, plus `build:static` when a change can reach the static site. There is no `.github/` and no CI (a self-hosted runner on this public repo would run fork PRs on the host), so the gate is local only; `git config core.hooksPath scripts/git-hooks` opts into running it on every push. `.vercel/` and `.output/` are git-ignored build output.
- **Prettier is enforced by `format:check`** (`.prettierrc`; `eslint-config-prettier` turns off lint's style rules, so lint never flags formatting). Run `bun run format` or `bunx prettier --write <files>` before committing. Prettier moves inline JSX spaces into `{" "}`, which changes compiled chunks without changing rendered text.
- **Single test:** `bunx vitest run src/lib/server/crypto.server.test.ts`, or add `-t "<name>"` for one case. vitest is the only test runner.
- **`scripts/*.ts` run directly on Node's type stripping** (`node scripts/migrate.ts`), so they may use only erasable TypeScript syntax (no enums, namespaces or parameter properties) and import each other with `.ts` extensions. The build runs them, so a violation fails the gate.
- **Lint ignores `docs/**`, `sidecars/**`, `native/**` and `src/routeTree.gen.ts`**, so a green lint says nothing about those. react-refresh is off for `src/routes/**` (TanStack routes export `Route` beside their components); everywhere else, keep hooks, constants and helpers out of component files.
- **TypeScript is 6.0.** 7.0 typechecks the tree but typescript-eslint does not load with it yet; `tsconfig.json` has no `baseUrl` (removed in 7).
- `VITE_AUTH_ENABLED` is an ordinary env var (sign-in is on unless it is `"false"`); only `build:static` sets it.
- If port 8080 is taken, see `AGENTS.md` (pass `BETTER_AUTH_URL` via the environment, or email sign-up fails with "Invalid origin").

## Deployment

- **As of 2026-09-23, `https://quesar.cloud` is the static build**, served by GitHub Pages from `main:/docs`. `bun run build:static` sets `VITE_STATIC_SITE=true` and `VITE_AUTH_ENABLED=false`, prerenders every crawlable page (skipping `/api/*` and server functions), then `scripts/publish-static.ts` replaces `docs/` wholesale and adds `.nojekyll`, `CNAME` and `404.html`. **`docs/` is build output only: never hand-edit it.** Internal records go in `notes/`.
- The full server build (`bun run build`, Nitro `vercel` preset; `vercel.json` sets the bun install and build commands with the daily audit-expiry cron in `vite.config.ts`) is planned for Vercel. Secrets and go-live order are in `notes/deploy/secrets-checklist.md`.
- `git fetch` before any push, never force-push.

## Architecture

**Framework.** TanStack Start (React 19, Vite 8, Tailwind v4, Radix/shadcn in `src/components/ui`). File routes live in `src/routes/`; `src/routeTree.gen.ts` is generated. `.` in a filename is a path separator (`quasar.site.$id.tsx` is `/quasar/site/:id`). HTTP endpoints are server routes under `src/routes/api/`. App logic reaches the server through `createServerFn` in `src/lib/*.ts`.

**Route files and the main bundle.** TanStack's code splitter lazy-loads only a route's `component` (plus `loader` where a route sets `codeSplitGroupings`). Everything else in a route file stays in the main bundle that every page loads: `beforeLoad`, `head`, `validateSearch`, and any top-level statement such as a `z.object(...)` schema. So look records up in the loader, keep heavy data and schemas in component modules (see `src/components/auth/login-form.tsx`), and check `docs/index.html`'s `modulepreload` list after a build.

**Server/client boundary.** Server-only modules are named `*.server.ts` (mostly `src/lib/server/`) so they never land in the client bundle; `src/lib/auth/middleware.ts` is dual-sided and may import only `*.server` modules on its server half. Per-user server functions use `.middleware([authMiddleware])` and scope every query by `context.userId` (the Better Auth `user.id`), never a client-sent id. `src/lib/profile.ts` is a representative example.

**Auth.** Better Auth (`src/lib/auth/server.ts`, mounted at `src/routes/api/auth/$.ts`): email/password, passkeys, and first-party Google, Apple and X. `src/lib/auth/methods.server.ts` reads each provider's credentials from the env (Apple's client-secret JWT is minted in `apple-secret.server.ts`), and the login page asks `getSignInMethods` (`src/lib/auth/methods.ts`) which buttons to render, so an unconfigured provider never shows. The admin rule (`src/lib/server/admin.server.ts`) accepts only a linked Google or Apple account. Session cookies are `__Host-quesar.*`.

**Database.** `src/lib/db.ts` uses Neon/pg when `DATABASE_URL` is set, otherwise in-memory PGLite (WASM Postgres), which loses data on restart. Both drivers are normalized to the same JSON-safe row shapes (int8 becomes a number). Migrations are plain SQL read non-recursively from `migrations/*.sql`. `migrations/auth/` is the template's opt-in copy of the auth schema and is never applied from there; `0001_auth.sql` is already in the root. PGLite applies them itself at startup (awaited by a Vite plugin in dev). Against Neon they are applied only by `scripts/migrate.ts` (`bun run db:migrate`), which `build` runs last. New schema means a new numbered file; never edit an applied one.

**Static mode.** `src/lib/static-site.ts` exports `staticSite`. Every surface that needs the server checks it and renders `src/components/site/server-only-notice.tsx` instead of calling out. GitHub panels fetch GitHub's public API from the browser, and contact becomes a mailto. New server-backed UI must handle `staticSite` or the Pages build breaks (`failOnError: true`) or ships dead controls.

**Server services (`src/lib/server/`).** `llm/` is the single model interface (xAI or Cloudflare AI Gateway to Gemini; an unconfigured provider returns `not_configured` and callers must say so, never fabricate). `crypto.server.ts` does AES-256-GCM sealing. `rate-limit.server.ts` is database-backed. `admin.server.ts` enforces the admin rule. There are also CSP and CSP reports, telemetry, Turnstile, and body limits. Config is read through `config.server.ts` and `src/lib/env.server.ts`.

**Workspace connectors.** Google Drive / Microsoft OAuth under `src/routes/api/workspace/*` and `src/lib/workspace-connectors/` (a deliberate deviation; see `AGENTS.md`).

**Head and SEO.** The root route (`src/routes/__root.tsx`) sets site-wide OG/Twitter defaults, the static `public/manifest.webmanifest` and the touch icon, and renders the canonical URL and `og:url` from the current route. Pages call `pageHead(title, description)` from `src/lib/seo.ts`, which mirrors both into OG and Twitter tags.

**Cinematic showcase.** `/showcase/*` are `ssr: false` routes that lazy-load `src/cinematic/rooms/<room>.tsx`. Playback runs on `src/lib/trailer-engine/` (vendored from mlai). `src/cinematic/components/CinematicShell.tsx` portals to `<body>` because `.page-enter`'s transform would trap `position: fixed`, so keep the portal. `/showcase` and the home teaser use the MP4 player in `src/components/site/trailer.tsx`.

**Standalone projects outside the root build.** `sidecars/quasar-service` (Bun, drives the `/quasar/*` screens), `sidecars/python-worker` (uv), and `native/` (Capacitor Android shell pointed at `https://quesar.cloud`, own `package.json`). None of them is covered by the root tsconfig, vitest or lint. Each README records its provenance from mlai `b6f3686`.

**Records.** `notes/merge/gap-matrix.md` is the mlai merge record, and `notes/superpowers/specs/2026-09-22-mlai-merge-design.md` is its spec. `notes/grok-export/` keeps the Grok-generated media and attachments. `screenshots/` and `artifacts/` are git-ignored local QA scratch.
