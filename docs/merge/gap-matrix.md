# mlai → quesar.cloud gap matrix

This is the checklist behind "all merged". Source: `donaldfilimon/MLAI-CORPORATION-WWW` at `b6f3686`, from `apps/mlai`, `packages/*`, `apps/quasar`, `sidecars/`, and `docs/`. Spec: `docs/superpowers/specs/2026-09-22-mlai-merge-design.md`.

A row is closed only when its **Status** reads `ported` (with the commit) or `retired` (with a reason). WS is the workstream from the spec.

## Pages

| mlai route | mlai view | quesar target | WS | Status |
|---|---|---|---|---|
| `/` | Home | `/` | D | ported `94bd0f7` |
| `/about` | About | `/about` | D | ported `94bd0f7` |
| `/benchmarks` | Benchmarks | `/benchmarks` | D | ported `94bd0f7` |
| `/blog`, `/blog/[slug]` | Blog, BlogPost (+ JSON-LD) | `/blog`, `/blog/$slug` | D | ported `94bd0f7` |
| `/changelog` | Changelog | `/changelog` | D | ported `94bd0f7` |
| `/docs`, `/docs/[slug]` | Docs (671), DocPage | `/docs`, `/docs/$slug` | D | ported `94bd0f7` |
| `/get-started` | GetStarted | `/get-started` | D | ported `94bd0f7` |
| `/links` | Links (248) | `/links` | D | ported `94bd0f7` |
| `/privacy`, `/terms` | LegalPage | `/privacy`, `/terms` | D | ported `94bd0f7` |
| `/products`, `/products/[slug]` | Products, Product (314) | `/products`, `/products/$slug` | D | ported `94bd0f7` |
| `/projects`, `/projects/[slug]` | Projects, ProjectPage | `/projects`, `/projects/$slug` | D | ported `94bd0f7` |
| `/research`, `/research/[slug]` | Research, ResearchPaper | `/research`, `/research/$slug` | D | ported `94bd0f7` |
| `/security` | Security | `/security` | D | ported `94bd0f7` |
| `/services` | Services | `/services` | D | ported `94bd0f7` |
| `/team`, `/team/[slug]` | Team, FounderProfile (291) | `/team`, `/team/$slug` | D | ported `94bd0f7` |
| `/showcase` | Showcase (316) | `/showcase` | D | ported `94bd0f7` |
| `/showcase/{trailer,film,abbey,explainer,mega,design}` | cinematic rooms | same | — | ported `2763e7d` |
| not-found / unauthorized / error | NotFound (133), unauthorized, error, global-error | root `notFoundComponent`, `/unauthorized` | D | ported `94bd0f7` (not-found, unauthorized); error pages use TanStack's default error boundary, see Follow-ups |
| `/feed.xml` | `buildRssFeed` | `/feed.xml` server route | D | ported `94bd0f7` |
| `/demo` | WdbxLiveDemo | `/demo` | E | ported `2d8dfc7` |
| `/financial-model` | ThreeStatementModelDemo | `/financial-model` | E | ported `2d8dfc7` |
| `/tf-pose-demo` | TFPoseDemo (TensorFlow) | `/tf-pose-demo` | E | ported `2d8dfc7` |
| — | `Math.tsx` (KaTeX) used by docs and research | `src/components/math` | E | ported `2d8dfc7` |
| `/login`, `/signup` | Login (WorkOS) | quesar `/login` (Better Auth) | — | retired: quesar login replaces it |
| `/profile` | Profile (198) | `/profile` | C | ported `89ff934` |
| `/console` | Console (chat, consent, audits, admin card) | `/console` tabs + `/admin` | A | ported `85a648b` |
| `/console/workspace` | ConsoleWorkspace (1,104) | `/console/workspace` | B | ported `21608b0` |
| `/app/[[...slug]]` | ConsoleWorkspace behind Better Auth, no handler | — | — | retired: broken in mlai (no Better Auth handler, WorkOS-gated data); `/console` replaces it |
| `/quasar` | QuasarSites | `/quasar/sites` (the `/quasar` marketing page stays) | F | ported `cecd1fb` |
| `/quasar/new`, `/quasar/settings`, `/quasar/site/[id]` | Quasar screens | `/quasar/new`, `/quasar/settings`, `/quasar/site/$id` | F | ported `cecd1fb` |

## API routes

| mlai API | quesar target | WS | Status |
|---|---|---|---|
| `auth/{login,callback,signup,logout,me,features,verify-user,mfa-status}` | — | — | retired: WorkOS; Better Auth `/api/auth/*` already covers the session |
| `profile` PATCH | `/profile` server function (`updateUser`) | C | ported `89ff934` |
| `billing/plans`, `billing/checkout` | `src/lib/billing.ts` server functions | C | ported `89ff934` |
| `llm/status`, `llm/chat` | `src/lib/console.ts` over `src/lib/server/llm` | A | ported `85a648b` |
| `consent` GET/POST/DELETE | console server functions | A | ported `85a648b` |
| `audits`, `audits/[id]` | console server functions | A | ported `85a648b` |
| `admin/audits`, `admin/audits/[id]` | `/admin` server functions (`requireAdmin`) | A | ported `85a648b` |
| `internal/audits/expire` (Cloud Scheduler OIDC) | `/api/cron/audits-expire` with a Vercel cron secret | A | ported `85a648b` |
| `telemetry/summary` | `/admin` server function | A | ported `85a648b` |
| `inquiries` POST (public) and GET (admin) | `src/lib/inquiries.ts` + `/admin` list | G, A | ported `859aa6d` (POST), `85a648b` (admin list) |
| `telemetry` POST | `/api/telemetry` | G | ported `859aa6d` |
| `csp-report` POST | `/api/csp-report` + a CSP header | G | ported `859aa6d`: report-only CSP set in `src/start.ts` (CSRF middleware kept first); PoseNet host added in `2f11e3f` |
| `workspace/{connect,callback,disconnect}/[provider]`, `connections`, `drive`, `sharepoint` | `/api/workspace/*` server routes | B | ported `21608b0` |
| per-route `opengraph-image.tsx` | — | — | retired: Grok PWA middleware owns og metas |

## Server modules

| mlai module | quesar target | WS | Status |
|---|---|---|---|
| `lib/server/workos.ts`, `session.ts`, `authkit-entry.ts`, `src/lib/auth.tsx` | Better Auth (`src/lib/auth/*`) | — | retired: WorkOS |
| `lib/server/db.ts` tables | `migrations/0003+` | 1 | ported `da82c1c` |
| `@google-cloud/kms` usage (audits, workspace tokens) | `src/lib/server/crypto.server.ts` (AES-256-GCM) | 1 | ported `da82c1c` |
| `checkAdminAccess` + MFA | `src/lib/server/admin.server.ts` (allowlist + broker-verified) | 1 | ported `da82c1c` |
| `lib/server/llm.ts` (Cloudflare gateway → Gemini) | `src/lib/server/llm/index.ts` (one module, both adapters) | 1 | ported `da82c1c` |
| rate limit | `src/lib/server/rate-limit.server.ts` (DB-backed) | 1 | ported `da82c1c` |
| `@mlai/store` Better Auth (hardcoded secret) | — | — | retired: quesar Better Auth |
| `@mlai/store` WDBX readers | `src/lib/wdbx.ts` if a surface reads them | D/E | retired: no merged surface reads WDBX stores; the /demo engine is in-browser and says so |
| `lib/sidecars.ts` `probeSidecar` | `/quasar/settings` + python-worker health probe | F | ported `cecd1fb` (Quasar probe). The python-worker probe is retired: the worker is optional, reached by URL, and no screen calls it |
| `lib/research-export.ts` | research pages | D | ported `94bd0f7` |
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
| `packages/design-tokens`, `packages/contracts` | — | — | retired: no merged surface consumed them; quesar's `src/styles.css` tokens and `src/lib/mlai/schemas.ts` types are the vocabulary |
| `packages/tooling` (monorepo topology check) | — | — | retired: one app, no workspace topology |
| `apps/quasar-web-old-bak` (evidence receipts) | stays in mlai | — | retired: historical evidence, preserved by the archive |
| `src/__tests__` (59 vitest files) | next to the ported code, `npm run test:app` | all | ported: each workstream ported its module tests; 345 tests in `npm run test:app` |


## Follow-ups (known, not blocking)

- **Account deletion** is not offered anywhere in the app. Any future deletion flow must purge the per-user rows in `workspace_connections`, `chat_consents`, `conversation_audits` and `field_notes`, and revoke the Google grant. A foreign key cascade was tried and rejected: auth-off dev mode and the tests use user ids that have no `user` row.
- **Custom error pages**: mlai's `error.tsx` and `global-error.tsx` are not ported. The root route uses TanStack's default error boundary.
- **Chat audit policy** was bumped to `2026-09-22.1` because its text changed (the KMS and MFA claims were removed), so existing consents must be re-accepted.
- **Measured versus unmeasured**: every live credential path is unmeasured on this machine. That covers xAI and Gemini, the Google and Microsoft OAuth round trip, Stripe, Turnstile, a running Quasar service, and a broker-signed-in admin.
