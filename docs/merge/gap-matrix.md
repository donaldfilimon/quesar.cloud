# mlai → quesar.cloud gap matrix

This is the checklist behind "all merged". Source: `donaldfilimon/MLAI-CORPORATION-WWW` at `b6f3686`, from `apps/mlai`, `packages/*`, `apps/quasar`, `sidecars/`, and `docs/`. Spec: `docs/superpowers/specs/2026-09-22-mlai-merge-design.md`.

A row is closed only when its **Status** reads `ported` (with the commit) or `retired` (with a reason). WS is the workstream from the spec.

## Pages

| mlai route | mlai view | quesar target | WS | Status |
|---|---|---|---|---|
| `/` | Home | `/` | D | open |
| `/about` | About | `/about` | D | open |
| `/benchmarks` | Benchmarks | `/benchmarks` | D | open |
| `/blog`, `/blog/[slug]` | Blog, BlogPost (+ JSON-LD) | `/blog`, `/blog/$slug` | D | open |
| `/changelog` | Changelog | `/changelog` | D | open |
| `/docs`, `/docs/[slug]` | Docs (671), DocPage | `/docs`, `/docs/$slug` | D | open |
| `/get-started` | GetStarted | `/get-started` | D | open |
| `/links` | Links (248) | `/links` | D | open |
| `/privacy`, `/terms` | LegalPage | `/privacy`, `/terms` | D | open |
| `/products`, `/products/[slug]` | Products, Product (314) | `/products`, `/products/$slug` | D | open |
| `/projects`, `/projects/[slug]` | Projects, ProjectPage | `/projects`, `/projects/$slug` | D | open |
| `/research`, `/research/[slug]` | Research, ResearchPaper | `/research`, `/research/$slug` | D | open |
| `/security` | Security | `/security` | D | open |
| `/services` | Services | `/services` | D | open |
| `/team`, `/team/[slug]` | Team, FounderProfile (291) | `/team`, `/team/$slug` | D | open |
| `/showcase` | Showcase (316) | `/showcase` | D | open |
| `/showcase/{trailer,film,abbey,explainer,mega,design}` | cinematic rooms | same | — | ported `2763e7d` |
| not-found / unauthorized / error | NotFound (133), unauthorized, error, global-error | root `notFoundComponent`, `/unauthorized` | D | open |
| `/feed.xml` | `buildRssFeed` | `/feed.xml` server route | D | open |
| `/demo` | WdbxLiveDemo | `/demo` | E | open |
| `/financial-model` | ThreeStatementModelDemo | `/financial-model` | E | open |
| `/tf-pose-demo` | TFPoseDemo (TensorFlow) | `/tf-pose-demo` | E | open |
| — | `Math.tsx` (KaTeX) used by docs and research | `src/components/math` | E | open |
| `/login`, `/signup` | Login (WorkOS) | quesar `/login` (Better Auth) | — | retired: quesar login replaces it |
| `/profile` | Profile (198) | `/profile` | C | open |
| `/console` | Console (chat, consent, audits, admin card) | `/console` tabs + `/admin` | A | open |
| `/console/workspace` | ConsoleWorkspace (1,104) | `/console/workspace` | B | open |
| `/app/[[...slug]]` | ConsoleWorkspace behind Better Auth, no handler | — | — | retired: broken in mlai (no Better Auth handler, WorkOS-gated data); `/console` replaces it |
| `/quasar` | QuasarSites | `/quasar/sites` (the `/quasar` marketing page stays) | F | open |
| `/quasar/new`, `/quasar/settings`, `/quasar/site/[id]` | Quasar screens | `/quasar/new`, `/quasar/settings`, `/quasar/site/$id` | F | open |

## API routes

| mlai API | quesar target | WS | Status |
|---|---|---|---|
| `auth/{login,callback,signup,logout,me,features,verify-user,mfa-status}` | — | — | retired: WorkOS; Better Auth `/api/auth/*` already covers the session |
| `profile` PATCH | `/profile` server function (`updateUser`) | C | open |
| `billing/plans`, `billing/checkout` | `src/lib/billing.ts` server functions | C | open |
| `llm/status`, `llm/chat` | `src/lib/console.ts` over `src/lib/server/llm` | A | open |
| `consent` GET/POST/DELETE | console server functions | A | open |
| `audits`, `audits/[id]` | console server functions | A | open |
| `admin/audits`, `admin/audits/[id]` | `/admin` server functions (`requireAdmin`) | A | open |
| `internal/audits/expire` (Cloud Scheduler OIDC) | `/api/cron/audits-expire` with a Vercel cron secret | A | open |
| `telemetry/summary` | `/admin` server function | A | open |
| `inquiries` POST (public) and GET (admin) | `src/lib/inquiries.ts` + `/admin` list | G, A | open |
| `telemetry` POST | `/api/telemetry` | G | open |
| `csp-report` POST | `/api/csp-report` + a CSP header | G | open (port both, or retire both) |
| `workspace/{connect,callback,disconnect}/[provider]`, `connections`, `drive`, `sharepoint` | `/api/workspace/*` server routes | B | open |
| per-route `opengraph-image.tsx` | — | — | retired: Grok PWA middleware owns og metas |

## Server modules

| mlai module | quesar target | WS | Status |
|---|---|---|---|
| `lib/server/workos.ts`, `session.ts`, `authkit-entry.ts`, `src/lib/auth.tsx` | Better Auth (`src/lib/auth/*`) | — | retired: WorkOS |
| `lib/server/db.ts` tables | `migrations/0003+` | 1 | open |
| `@google-cloud/kms` usage (audits, workspace tokens) | `src/lib/server/crypto.server.ts` (AES-256-GCM) | 1 | open |
| `checkAdminAccess` + MFA | `src/lib/server/admin.server.ts` (allowlist + broker-verified) | 1 | open |
| `lib/server/llm.ts` (Cloudflare gateway → Gemini) | `src/lib/server/llm/gemini-gateway.ts` | 1 | open |
| rate limit | `src/lib/server/rate-limit.server.ts` (DB-backed) | 1 | open |
| `@mlai/store` Better Auth (hardcoded secret) | — | — | retired: quesar Better Auth |
| `@mlai/store` WDBX readers | `src/lib/wdbx.ts` if a surface reads them | D/E | open (port only if used) |
| `lib/sidecars.ts` `probeSidecar` | `/quasar/settings` + python-worker health probe | F | open |
| `lib/research-export.ts` | research pages | D | open |
| `src/lib/docs-search.ts` brief composer | — | — | retired: never wired to a route in mlai |

## Repo contents

| mlai path | quesar target | WS | Status |
|---|---|---|---|
| `docs/brand.md`, `docs/verification/`, `docs/superpowers/`, dated records | `docs/mlai/` | H | ported `3d35171` |
| `docs/sources/` | stays in mlai (frozen, preserved by the GitHub archive) | — | retired: frozen reference |
| `apps/quasar/packages/{service,shared}` | `sidecars/quasar-service/` | H | ported `3d35171` |
| `sidecars/python-worker` | `sidecars/python-worker/` | H | ported `3d35171` (+ fixture `9151131`) |
| `packages/capacitor-cloudkit`, Capacitor config, `android/` | `native/` | H | ported `3d35171` |
| `packages/trailer-engine` | `src/lib/trailer-engine/` | — | ported `2763e7d` |
| `packages/design-tokens`, `packages/contracts` | `src/lib/mlai/*` tokens and types, where used | D | open |
| `packages/tooling` (monorepo topology check) | — | — | retired: one app, no workspace topology |
| `apps/quasar-web-old-bak` (evidence receipts) | stays in mlai | — | retired: historical evidence, preserved by the archive |
| `src/__tests__` (59 vitest files) | next to the ported code, `npm run test:app` | all | open |
