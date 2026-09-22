# Design: merge all of mlai into quesar.cloud (one app)

Status: approved by Donald 2026-09-22. Source of this spec: the brainstorming session that also landed `2763e7d`.

## Context
On 2026-09-22 Donald made `donaldfilimon/quesar.cloud` the main repo. It is a Grok export on TanStack Start, Vite 8, React 19, Tailwind v4 and npm, cloned at `~/dev/active/quesar.cloud`.

The trailer port (plan v1) is committed locally as `2763e7d` and **not yet pushed**. mlai `b6f3686`, the note that mlai is superseded, is also unpushed. Donald said to push that one straight to `main` with no PR.

He now wants everything else from `~/dev/active/mlai` in quesar.cloud as **one app**: dashboards, components, logins, docs, services. Every surface must be finished, not stubbed.

**Decisions (Donald, 2026-09-22):**
1. **Auth:** quesar's Better Auth only. That is the Grok broker for Google and X, plus email/password, backed by Postgres or PGLite. WorkOS is retired. Admin rights come from an `ADMIN_EMAILS` allowlist.
2. **LLM:** one server-side provider interface, with an xAI adapter (quesar today) and a Cloudflare AI Gateway → Gemini adapter (mlai), selected by env. Every AI surface uses it. When no provider is configured, the UI says so honestly; replies are never mocked.
3. **Connectors:** port mlai's own Drive and SharePoint OAuth. Encrypt refresh tokens with AES-256-GCM using the env key `APP_ENCRYPTION_KEY`, which replaces GCP KMS. Audit bodies use the same crypto.
4. **Repo:** move docs, the Quasar service and the Python worker into quesar.cloud. The sidecars are services reached by URL, not apps. After parity is verified, mlai is archived on GitHub (Donald does that step).

**Survey facts this plan depends on:**
- **What quesar already has:**
  - Better Auth is on and working: `src/lib/auth/*`, `gates.tsx` and `authMiddleware`, with `context.userId`.
  - `/console` (field notes), `/dashboard` (`askDesk`), `/console/workspace` (localStorage documents), `/profile`.
  - About 60 routes. Content lives in `src/lib/mlai/*`, `content.ts` and `catalog.ts`.
- **What mlai has that quesar lacks:**
  - WorkOS-gated APIs: `llm/chat` with consent and KMS-encrypted audits, admin audits (MFA), inquiries (Turnstile), telemetry and its summary, a CSP report, billing plans and checkout (Stripe link), profile PATCH, and workspace OAuth for Drive and SharePoint.
  - Views: `ConsoleWorkspace.tsx` (1,104 LOC), `Console.tsx`, the Quasar screens (`lib/quasar-screens.tsx` plus `quasar-api.ts` over `@quasar/shared`), the demos (`WdbxLiveDemo`, `ThreeStatementModelDemo`, `TFPoseDemo`), `feed.xml`, and richer public views (Docs 671, Product 314, FounderProfile 291, Links 248, Showcase 316, Home, About, NotFound).
  - 431 vitest cases plus 8 bun tests.
- **Already broken in mlai:** `/app/*` has no Better Auth handler, and its data APIs still need WorkOS. There is no behaviour to preserve beyond the console views.

**Grok contract** (quesar `AGENTS.md`, binding):
- Never rewrite `src/lib/auth/server.ts`, and never edit `migrations/auth/`.
- Sign-in stays limited to the broker (Google, X) plus email/password.
- Put `authMiddleware` on every server function, and scope every query by `context.userId`.
- Never create `.env`.
- Leave `public/__grok/`, `server/` and `scripts/grok-pwa-*` alone.
- Dev runs on port 8080 through `npm run dev`.
- `npm run build` rewrites the tracked `.vercel/output/`: never commit that output by accident.
- The target is Vercel, so no filesystem writes at runtime.

## Process (superpowers)
1. Brainstorming produces a spec, which is this plan's content written to `quesar.cloud/docs/superpowers/specs/2026-09-22-mlai-merge-design.md`.
2. writing-plans produces `docs/superpowers/plans/2026-09-22-mlai-merge.md`, with a task list per workstream.
3. Donald reviews the spec before Phase 2.
4. Workstreams then run with **dispatching-parallel-agents** and **subagent-driven-development**:
   - one implementer subagent per workstream, then a spec-compliance review, then a code-quality review, before merging.
   - Parallel agents that mutate one repo justify worktrees (charter exception), so each workstream gets `isolation: "worktree"`.
   - Merge back to `main` in order, then remove each worktree and delete its branch before pushing.

## Phase 0: Land pending work (me, sequential)
- quesar.cloud: `git fetch`. If `origin/main` is still `ba67843`, push `2763e7d`. Otherwise rebase `2763e7d` onto it; never force-push.
- mlai: `git fetch`, then push `b6f3686` to `origin/main` directly, as Donald chose. Leave the foreign `apps/mlai/next-env.d.ts` change out.
- Write and commit the spec and plan documents in quesar `docs/superpowers/`. Also write a **gap matrix** at `docs/merge/gap-matrix.md`: every mlai route, API and component, its quesar target, and the owning workstream. This is the checklist that proves "all".

## Phase 1: Foundations (me, sequential; everything else depends on it)
All new code lives in quesar under `src/lib/server/` (server-only) and `src/lib/*`.

1. **`env.server.ts` extension.** A zod-validated optional config covering:
   - `XAI_API_KEY`, `CLOUDFLARE_AI_GATEWAY_URL`/`_TOKEN`/`_ID`, `LLM_PROVIDER`;
   - `APP_ENCRYPTION_KEY`, `ADMIN_EMAILS`;
   - `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID`/`_SECRET`/`_TENANT`;
   - `STRIPE_PAYMENT_LINK`, `BILLING_PROVIDER`;
   - `TURNSTILE_SITE_KEY`/`_SECRET`/`_HOSTNAMES`, `QUASAR_SERVICE_ORIGIN`.

   Each missing value produces a typed "not configured" state, never a crash.
2. **Migrations** (`migrations/0003_*.sql` onward; never touch `migrations/auth/`):
   - `inquiries`, `telemetry_events`, `chat_consents`, `conversation_audits`, `audit_access_events`, `workspace_connections`.
   - Port the schemas from mlai `src/lib/server/db.ts`. Rekey them by Better Auth `user.id` instead of WorkOS subject and org.
3. **`crypto.server.ts`.** AES-256-GCM seal and open with a versioned envelope, replacing `@google-cloud/kms`. `AUDIT_SUBJECT_PEPPER` becomes an HMAC under the same key family. Unit-test the round trip, tamper rejection and wrong-key rejection.
4. **`admin.server.ts`.** `requireAdmin` = `authMiddleware` + email in `ADMIN_EMAILS` **+ a broker-verified identity**. Email/password sign-up is open and sends no verification mail, so an allowlisted address alone can be spoofed.
   - The user must have `emailVerified = true` (`gate-identity.server.ts:203` sets it for broker sign-ins) or an `account` row with provider `grok-google`/`grok-x`. Confirm which of these Better Auth actually persists before relying on it.
   - Unit test: an email/password account using an allowlisted address is **rejected**.
   - This replaces WorkOS `checkAdminAccess` and MFA. Admin actions still require a reason string.
   - Fail closed: with no `APP_ENCRYPTION_KEY`, chat that requires audits refuses to run rather than storing plaintext, and workspace connect is disabled.
5. **`llm/`.**
   - `index.ts` holds `complete({messages, persona, userId})` and the provider selection.
   - Adapters: `xai.ts`, lifted from `src/lib/ai.ts`, and `gemini-gateway.ts`, ported from mlai `src/lib/server/llm.ts`.
   - Add a per-user rate cap.
   - Rewire `askPersona` (`src/lib/ai.ts`) and `askDesk` (`src/lib/systems.ts`) onto it.
6. **`rate-limit.server.ts`, backed by the database** (not memory, because of Vercel). Port the logic from mlai.
7. **Dependencies and UI rules, set up front** so parallel workstreams never touch `package.json`:
   - Install `katex`, `@tensorflow/tfjs` and `@tensorflow-models/posenet`. Add `framer-motion` only if a ported view truly needs it; check actual imports first.
   - Rule: port to quesar's Radix/shadcn `src/components/ui/*` and the TanStack `Link`. Use no `@base-ui/react`, no `react-router-dom` shim, and nothing from `next/*`.
   - `routeTree.gen.ts`: worktrees may regenerate it locally to typecheck, but they commit without it. I regenerate it once per merge.
8. **Record deviations in `AGENTS.project.md` now**, so a later Grok session doesn't "fix" them away:
   - Drive/SharePoint use our own OAuth connectors (Donald's override of the `app-data` rule). They are data connectors, not sign-in methods.
   - Admin is the `ADMIN_EMAILS` allowlist plus a broker-verified identity.
   - Rows are user-scoped by the Better Auth user id.
9. **Test runner.** Add `vitest` as a dev dependency with a `test:app` script. Keep the Grok `npm test` untouched: its 13 failures are pre-existing macOS template failures. Phase 1 modules get unit tests.

**Gate:** `npm run typecheck`, `npm run lint` (0 errors) and `npm run test:app` green, then commit.

## Phase 2: Parallel workstreams (subagents, one worktree each, disjoint file sets)
Workstreams **must not** edit shared files: `package.json`, `package-lock.json`, `src/routeTree.gen.ts`, header/footer nav in `src/lib/content.ts`, `sitemap.xml` and `AGENTS*`. Each one reports the dependencies and nav entries it needs, and I integrate them in Phase 3. Each ports the relevant mlai vitest tests next to its code.

| WS | Scope | Owns | mlai sources |
|---|---|---|---|
| **A: Console and admin** | `/console` gains tabs: Notes (existing), Chat (LLM with a consent gate and conversation audits), My audits (view and delete). New `/admin`: audit review with a reason, telemetry summary, inquiries list. This gives UI to mlai's orphaned `getTelemetrySummary` and inquiries GET. | `src/routes/console*.tsx`, `src/routes/admin*.tsx`, `src/components/console/**`, `src/lib/console.ts` | `src/views/Console.tsx`, `app/api/{llm,consent,audits,admin}/**`, `lib/server/audit-store*` |
| **B: Workspace connectors** | `/console/workspace` merges quesar `WorkspaceApp` (local documents) with mlai `ConsoleWorkspace` (Drive, SharePoint and OneDrive). OAuth start and callback, connection list and disconnect are TanStack server routes. Tokens are sealed with `crypto.server.ts`. | `src/routes/api/workspace/**`, `src/components/workspace/**`, `src/lib/workspace-connectors/**` | `ConsoleWorkspace.tsx`, `workspace-adapters.ts`, `app/api/workspace/**` |
| **C: Profile and billing** | `/profile`: edit name through Better Auth `updateUser`, show sessions, sign out everywhere, billing plans and checkout (Stripe link, with an honest "not configured" state). | `src/routes/profile.tsx`, `src/components/profile/**`, `src/lib/billing.ts` | `src/views/Profile.tsx`, `app/api/{profile,billing}/**` |
| **D: Public content parity** | Diff each mlai public view against its quesar page and port what is missing (content, sections, JSON-LD): Home, About, Team and FounderProfile, Products and Product, Docs and DocPage, Links, Services, Security, Showcase index, NotFound, `/unauthorized`. Add `/feed.xml` as a server route using `buildRssFeed`. Reconcile `src/data/categories/*` with `src/lib/mlai/*`, where quesar's typed copy wins and gaps are filled. | `src/routes/{index,about,team*,products*,docs*,links,services,security,showcase}.tsx`, `src/routes/feed[.]xml.ts`, `src/lib/mlai/**`, `src/components/site/*` (only new files) | `src/views/*`, `src/data/**`, `src/lib/rss*` |
| **E: Demos** | `/demo` gets the real `WdbxLiveDemo`. `/financial-model` gets `ThreeStatementModelDemo`. `/tf-pose-demo` gets the real TensorFlow pose demo, client-only. Add the KaTeX `Math` component used by docs and research. | `src/routes/{demo,financial-model,tf-pose-demo}.tsx`, `src/components/demos/**`, `src/components/math/**` | `src/components/demos/*`, `src/views/TFPoseDemo.tsx`, `Math.tsx` |
| **F: Quasar screens** | `/quasar/sites`, `/quasar/new`, `/quasar/settings` and `/quasar/site/$id`, fully styled with quesar's UI. Vendor `@quasar/shared` into `src/lib/quasar/`. The origin comes from settings (localStorage), falling back to `QUASAR_SERVICE_ORIGIN`. The existing `/quasar` marketing page links to them. | `src/routes/quasar.*.tsx`, `src/components/quasar/**`, `src/lib/quasar/**` | `lib/quasar-api.ts`, `lib/quasar-screens.tsx`, `apps/quasar/packages/shared` |
| **G: Inquiries, telemetry, CSP** | `/contact` posts to an `inquiries` server function with optional Turnstile and the rate limit. Keep the localStorage copy as the offline receipt. Add the client for `/api/telemetry` (path allowlist), and `/api/csp-report`. | `src/routes/contact.tsx`, `src/routes/api/{telemetry,csp-report}.ts`, `src/lib/inquiries.ts`, `src/components/turnstile.tsx` | `app/api/{inquiries,telemetry,csp-report}/**`, `InquiryForm.tsx`, `TurnstileWidget.tsx` |
| **H: Repo move** | Copy with provenance (mlai SHA recorded in each directory's `README`):<br>• `mlai/docs/{brand.md, verification/, superpowers/}` → `docs/mlai/`<br>• `apps/quasar/packages/service` and `shared` → `sidecars/quasar-service/` (Bun, own `package.json` and lockfile, outside the npm build)<br>• `sidecars/python-worker` → `sidecars/python-worker/`<br>• `packages/capacitor-cloudkit` and the Capacitor config → `native/` (the shell loads the deployed URL; iOS remains blocked on CocoaPods)<br>• `docs/sources/` stays in mlai: it is frozen reference, and the GitHub archive preserves it. | `docs/**`, `sidecars/**`, `native/**` | as listed |

Every workstream, before it reports done:
- runs `tsc` and `eslint` clean on its own files and its ported tests green;
- works in both signed-in and signed-out states;
- when config is missing, renders a "not configured" state, never a crash or a fake result.

## Phase 3: Integration and completion sweep (me)
- Merge the worktrees in order H → D → E → G → F → C → B → A, with dependencies and nav applied between merges. Regenerate `routeTree.gen.ts` through a build, and update the header, footer, search index and `sitemap.xml` for every new route.
- **Completion sweep:** walk the gap matrix row by row, and grep `src/` for `not implemented`, `coming soon`, `TODO`, `placeholder` and `mock` outside design boards. Every row must be ported or explicitly retired with a reason.
  - Retired: WorkOS; KMS; MFA; the broken `/app/*` catch-all, replaced by `/console`; and per-route `opengraph-image.tsx`, because Grok's PWA middleware owns the og metas.
  - CSP: port mlai's CSP header together with the Turnstile and connector allowances, so `/api/csp-report` actually receives reports. Otherwise retire both, and say which.
- Update `AGENTS.project.md` with the env table, the sidecars, the test command and the admin model. Update the `~/CLAUDE.md` row and memory.

## Phase 4: Retire mlai (docs only)
- Commit notes in mlai `AGENTS.md` and `CLAUDE.md`: "merged into quesar.cloud at `<sha>`; read-only".
- Tell Donald the GitHub archive step for `MLAI-CORPORATION-WWW`. Nothing is deleted locally.

## Verification
- **Per phase:** `npm run typecheck`, `npm run lint` (0 errors), `npm run test:app` green, `npm run build` green. Then `git checkout -- .vercel && git clean -fd .vercel` so build output is never committed.
- **Browser** (preview config `quesar-dev`, port 8091), crawling every route in `routeTree.gen.ts` signed-out and signed-in:
  - 200 status or the expected redirect;
  - no console errors;
  - "not configured" banners where env is absent.
- **Signed-in journeys:**
  - email sign-up;
  - console note plus chat consent;
  - an audit visible and deletable;
  - an admin audit with a reason:
    - Pass `ADMIN_EMAILS` through the preview launch config (`env ADMIN_EMAILS=… npm --prefix … run dev`), since `.env` is forbidden.
    - Only a broker login can become admin, and that can't happen on localhost, so the admin happy path stays unmeasured locally. The rejection path (an email/password account with an allowlisted address is refused) *is* measured.
  - profile name edit;
  - a contact inquiry that shows up in `/admin`;
  - a Quasar settings origin saved.
- **Live pieces stay unmeasured and are reported that way:** Google and Microsoft OAuth, Stripe, Turnstile, Gemini or xAI, and a running Quasar service. Each needs credentials that are not on this machine.
- **Sidecars:** `cd sidecars/quasar-service && bun test` green; the Python worker keeps its own validate script.

## Risks
- **Grok re-export collision:** a new "Export from Grok" push can conflict. Always fetch before pushing and never force-push. Tell Donald that further Grok edits should wait until Phase 3 lands.
- **Vercel runtime limits:** PGLite in serverless means no persistence without `DATABASE_URL`. Say so in `AGENTS.project.md`; don't paper over it.
- **Bundle size:** TensorFlow and KaTeX are client-only lazy chunks.
