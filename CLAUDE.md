# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Which instruction file is which

- **`AGENTS.project.md` is Donald's standing rules for this repo. Read it before any edit.** It holds the merge-from-mlai deviations (own OAuth workspace connectors, admin rule, AES-GCM sealing, account deletion, static build) and the env-var table. This file only points at them.
- **`AGENTS.md` and `.grok/` are Grok App Builder's sandbox contract. Don't edit them.** Their rules about `/workspace`, `startup.sh`, the preview proxy and "never create `.env`" describe Grok's Linux sandbox, not this Mac. Don't run `startup.sh` locally (it hardcodes `cd /workspace`). Leave the Grok platform chrome alone (`grokPwaPlugin()`, `server/middleware/grok-pwa.ts`, `<PreviewHostBridge />`, `public/__grok/`, `scripts/grok-pwa-*`): Grok exports to `main` would reinstate it, and removing `server/` unwires `/?install=1` on deploys.
- This is the main MLAI/Quesar site. `~/dev/active/mlai` is a read-only port source; don't build site work there.

## Commands

npm only (`package-lock.json`); run `npm ci` first.

```bash
npm run dev          # 0.0.0.0:8080, strictPort; always via npm, never `npx vite`
npm run typecheck    # tsc --noEmit over src/ and server/
npm run lint         # eslint; 0 errors expected
npm run test:app     # vitest: the app suite
npm run build        # vite build (Vercel preset) + PGLite assets + db:migrate
npm run build:static # GitHub Pages build into docs/
```

- **Gate:** `typecheck`, `lint`, `test:app`, `build`. Then run `git checkout -- .vercel && git clean -fd .vercel`: `.vercel/output/` is tracked and every build rewrites it. Never commit that churn by accident.
- **Single test:** `npx vitest run src/lib/server/crypto.server.test.ts`, or add `-t "<name>"` for one case. Vitest covers `src/**/*.test.{ts,tsx}` but **excludes `src/lib/app-data/**` and `src/lib/auth/**`**. `npm test` runs `scripts/**/*.test.mjs` plus four named files from those directories (`app-data.test.ts`, `readiness-schedule.test.ts`, `gate-identity.test.ts`, `sign-in-gate.test.ts`) under `node --test`; a new test file in those directories runs under neither runner unless added to that script. That is Grok's template suite, and per `AGENTS.project.md` it carries 13 known failures on macOS that predate app changes.
- **Lint ignores `docs/**`, `sidecars/**`, `native/**` and `src/routeTree.gen.ts`**, so a green lint says nothing about those.
- Every Vite entry (`dev`, `build`, `preview`) goes through `scripts/with-app-env.mjs`, which merges `VITE_*` keys from `.grok/app-env.json`. Starting Vite directly makes dev and build disagree on `VITE_AUTH_ENABLED`. `npm run check:auth` detects that against a running dev server.
- If port 8080 is taken, see `AGENTS.project.md` (pass `BETTER_AUTH_URL` via the environment, or email sign-up fails with "Invalid origin").

## Deployment

- **As of 2026-09-23, `https://quesar.cloud` is the static build**, served by GitHub Pages from `main:/docs`. `npm run build:static` sets `VITE_STATIC_SITE=true` and `VITE_AUTH_ENABLED=false`, prerenders every crawlable page (skipping `/api/*` and server functions), then `scripts/publish-static.mjs` replaces `docs/` wholesale and adds `.nojekyll`, `CNAME` and `404.html`. **`docs/` is build output only: never hand-edit it.** Internal records go in `notes/`.
- The full server build (`npm run build`, Nitro `vercel` preset with the daily audit-expiry cron in `vite.config.ts`) is planned for Vercel. Secrets and go-live order are in `notes/deploy/secrets-checklist.md`.
- Grok exports push straight to `main`: `git fetch` before any push, never force-push.

## Architecture

**Framework.** TanStack Start (React 19, Vite 8, Tailwind v4, Radix/shadcn in `src/components/ui`). File routes live in `src/routes/`; `src/routeTree.gen.ts` is generated. `.` in a filename is a path separator (`quasar.site.$id.tsx` is `/quasar/site/:id`). HTTP endpoints are server routes under `src/routes/api/`. App logic reaches the server through `createServerFn` in `src/lib/*.ts`.

**Server/client boundary.** Server-only modules are named `*.server.ts` (mostly `src/lib/server/`) so they never land in the client bundle; `src/lib/auth/middleware.ts` is dual-sided and may import only `*.server` modules on its server half. Per-user server functions use `.middleware([authMiddleware])` and scope every query by `context.userId` (the Better Auth `user.id`), never a client-sent id. `src/lib/profile.ts` is a representative example.

**Auth.** Better Auth (`src/lib/auth/server.ts`, mounted at `src/routes/api/auth/$.ts`): email/password plus the Grok broker (Google, X). `src/lib/auth/` and `src/lib/app-data/` originate in the Grok template, but Donald has since fixed auth there (redirect loop, sign-in `next`, account deletion in `server.ts`): check `git log` on a file before treating it as untouched template code.

**Database.** `src/lib/db.ts` uses Neon/pg when `DATABASE_URL` is set, otherwise in-memory PGLite (WASM Postgres), which loses data on restart. Both drivers are normalized to the same JSON-safe row shapes (int8 becomes a number). Migrations are plain SQL read non-recursively from `migrations/*.sql`. `migrations/auth/` is the template's opt-in copy of the auth schema and is never applied from there; `0001_auth.sql` is already in the root. PGLite applies them itself at startup (awaited by a Vite plugin in dev). Against Neon they are applied only by `npm run db:migrate`, which `build` runs last. New schema means a new numbered file; never edit an applied one.

**Static mode.** `src/lib/static-site.ts` exports `staticSite`. Every surface that needs the server checks it and renders `src/components/site/server-only-notice.tsx` instead of calling out. GitHub panels fetch GitHub's public API from the browser, and contact becomes a mailto. New server-backed UI must handle `staticSite` or the Pages build breaks (`failOnError: true`) or ships dead controls.

**Server services (`src/lib/server/`).** `llm/` is the single model interface (xAI or Cloudflare AI Gateway to Gemini; an unconfigured provider returns `not_configured` and callers must say so, never fabricate). `crypto.server.ts` does AES-256-GCM sealing. `rate-limit.server.ts` is database-backed. `admin.server.ts` enforces the admin rule. There are also CSP and CSP reports, telemetry, Turnstile, and body limits. Config is read through `config.server.ts` and `src/lib/env.server.ts`.

**Workspace connectors.** Google Drive / Microsoft OAuth under `src/routes/api/workspace/*` and `src/lib/workspace-connectors/` (a deliberate deviation; see `AGENTS.project.md`).

**Cinematic showcase.** `/showcase/*` are `ssr: false` routes that lazy-load `src/cinematic/rooms/<room>.tsx`. Playback runs on `src/lib/trailer-engine/` (vendored from mlai). `src/cinematic/components/CinematicShell.tsx` portals to `<body>` because `.page-enter`'s transform would trap `position: fixed`, so keep the portal. `/showcase` and the home teaser use the MP4 player in `src/components/site/trailer.tsx`.

**Standalone projects outside the npm build.** `sidecars/quasar-service` (Bun, drives the `/quasar/*` screens), `sidecars/python-worker` (uv), and `native/` (Capacitor Android shell pointed at `https://quesar.cloud`, own `package.json`). None of them is covered by the root tsconfig, vitest or lint. Each README records its provenance from mlai `b6f3686`.

**Records.** `notes/merge/gap-matrix.md` is the mlai merge record, and `notes/superpowers/specs/2026-09-22-mlai-merge-design.md` is its spec. `screenshots/`, `artifacts/` and `attachments/` are QA and Grok output, not source.
