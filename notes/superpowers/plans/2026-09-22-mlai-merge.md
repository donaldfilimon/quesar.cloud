# Implementation plan: merge mlai into quesar.cloud

- **Spec:** `notes/superpowers/specs/2026-09-22-mlai-merge-design.md`.
- **Checklist:** `notes/merge/gap-matrix.md`. Every row ends as `ported <sha>` or `retired: <reason>`.
- **Sources:** mlai at `b6f3686` (`~/dev/active/mlai`), read-only.

**Gates for every task:**
- `npm run typecheck`
- `npm run lint`, with 0 errors
- `npm run test:app`
- After a build, restore `.vercel/output` (`git checkout -- .vercel && git clean -fdq -- .vercel`).
- The pre-existing 13 failures in the Grok template's `npm test` are not ours.

## Phase 0: land and document
- [x] Push quesar `2763e7d` (the trailers) and mlai `b6f3686` (the superseded note).
- [x] Write the spec, this plan, and the gap matrix.

## Phase 1: foundations (sequential, main checkout)
1. [x] `vitest` dev dependency plus a `test:app` script (`vitest run`); config includes `src/**/*.test.ts(x)` but excludes the Grok template tests that `npm test` already runs.
2. [x] `src/lib/server/config.server.ts`: zod-parsed optional env, with `configured(feature)` helpers covering `llm`, `encryption`, `admin`, `google`, `microsoft`, `billing`, `turnstile` and `quasar`.
3. [x] `src/lib/server/crypto.server.ts`: AES-256-GCM `seal`/`open` with the envelope `v1.<iv>.<ct>.<tag>` (base64url), plus an HMAC `subjectHash`. Tests: round trip, tamper rejection, wrong key, missing key rejected.
4. [x] Migrations `0003_inquiries.sql`, `0004_telemetry.sql`, `0005_console_audits.sql` (`chat_consents`, `conversation_audits`, `audit_access_events`), `0006_workspace_connections.sql` and `0007_rate_limits.sql`. Port the columns from mlai `src/lib/server/db.ts`, with every row owned by the Better Auth `user.id`.
5. [x] `src/lib/server/admin.server.ts`: `isAdminUser(user, accounts)` (pure) and `requireAdmin` middleware. Admin requires the allowlist **and** (`emailVerified` or an account with provider `grok-google`/`grok-x`). Tests: an allowlisted email/password account is rejected; a verified broker account is accepted; a non-allowlisted account is rejected.
6. [x] `src/lib/server/rate-limit.server.ts`: a fixed window stored in the `rate_limits` table. Tests use a PGLite instance.
7. [x] `src/lib/server/llm/`:
   - `types.ts` and `index.ts` with `complete()` and `status()`
   - `xai.ts`, lifted from `src/lib/ai.ts`
   - `gemini-gateway.ts`, ported from mlai `src/lib/server/llm.ts`

   Rewire `askPersona` and `askDesk`. Tests cover adapter selection and the not-configured state using a stubbed `fetch`.
8. [x] Install the Phase 2 dependencies: `katex`, `@types/katex`, `@tensorflow/tfjs`, `@tensorflow-models/posenet`, and `framer-motion` only if the ported demos import it.
9. [x] `AGENTS.project.md`: record the deviations (own OAuth connectors, admin model, user-scoped rows), the env table, and the test command.
10. [x] Commit and push after the gates are green.

## Phase 2: workstreams (parallel subagents, `isolation: worktree`)
Rules every implementer gets:
- **Shared files are off limits:** `package.json`, `package-lock.json`, `src/routeTree.gen.ts`, nav and footer in `src/lib/content.ts`, `public/sitemap.xml`, `AGENTS*`, and anything under `src/lib/auth/`, `migrations/auth/`, `server/`, `public/__grok/` or `.grok/`.
- **Frameworks:** TanStack `Link` and `createFileRoute`, UI from `src/components/ui/*`. No `next/*`, `react-router-dom` or `@base-ui/react`.
- **Server functions** use `createServerFn` with `authMiddleware`, and every query is scoped by `context.userId`. Admin uses `requireAdmin`.
- **Missing config** shows an honest "not configured" state. No mocked data or AI replies.
- **Port mlai's tests** for the code being ported, next to it.
- **Report back:**
  - files changed;
  - the gap-matrix rows closed;
  - the nav entries and dependencies needed;
  - gate output;
  - anything left unmeasured.

| WS | Tasks |
|---|---|
| A | Add Chat, Consent and My audits tabs to `/console`. `/admin` covers audits with a reason, the telemetry summary and inquiries. Add the `/api/cron/audits-expire` cron route. |
| B | Workspace OAuth routes (Google, Microsoft), adapters, sealed tokens, and a merged `/console/workspace` UI. |
| C | `/profile`: name edit, sessions, sign out everywhere, billing plans and checkout. |
| D | Public view parity (the Pages table in the gap matrix), `/feed.xml`, NotFound, `/unauthorized`, research export. |
| E | `/demo` WdbxLiveDemo, `/financial-model`, `/tf-pose-demo`, KaTeX `Math`. |
| F | `/quasar/sites`, `/quasar/new`, `/quasar/settings`, `/quasar/site/$id`, and the vendored `@quasar/shared`. |
| G | `/contact` backed by the `inquiries` server function with Turnstile and the rate limit; `/api/telemetry`; `/api/csp-report` together with the CSP header. |
| H | `notes/mlai/`, `sidecars/quasar-service/`, `sidecars/python-worker/`, `native/`, with provenance READMEs. |

Each workstream result goes through a spec-compliance review, then a code-quality review, then a merge.

## Phase 3: integrate (main checkout)
- Merge in the order H, D, E, G, F, C, B, A. Between merges, apply nav and dependency changes, rebuild, and regenerate `routeTree.gen.ts`.
- Do the completion sweep over the gap matrix and grep for stubs.
- Crawl every route in the browser signed-out and signed-in, and run the journeys in the spec.

## Phase 4: retire mlai
- Put a note in mlai `AGENTS.md`/`CLAUDE.md` saying mlai has been merged into quesar.cloud at `<sha>`.
- Donald archives the GitHub repo.
