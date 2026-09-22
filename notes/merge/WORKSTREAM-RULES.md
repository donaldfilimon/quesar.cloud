# Rules for every Phase 2 workstream

- **Where you work:** your own git worktree, on branch `ws/<id>`. `node_modules` is symlinked from the main checkout, so never run `npm install` or `npm ci`.
- **Sources:** mlai, read-only, at `~/dev/active/mlai` (commit `b6f3686`). The app lives at `apps/mlai`, packages at `packages/*`, the Quasar service at `apps/quasar`.
- **Target:** TanStack Start file routes in `src/routes`, UI from `src/components/ui/*` (Radix/shadcn), site components from `src/components/site/*`, and Tailwind v4 tokens from `src/styles.css` (`bg-bg`, `text-fg`, `text-fg-muted`, `border-border`, `bg-accent`, etc.).
  - **Forbidden imports:** `next/*`, `react-router-dom`, `@base-ui/react`, `framer-motion`. Use CSS or `tw-animate-css`, and respect `prefers-reduced-motion`.
  - **Links:** `import { Link } from "@tanstack/react-router"`.
- **Server code:**
  - Use `createServerFn` with `.middleware([authMiddleware])` from `@/lib/auth/middleware`, and scope every query by `context.userId`.
  - Admin-only code calls `assertAdmin(context.userId)` from `@/lib/server/admin.server`.
  - Import `*.server` modules and `@/lib/server/*` **dynamically inside handlers** (`await import(...)`), so they never reach the client bundle.
  - Use `getSql()` from `@/lib/db`. The tables come from `migrations/0003-0007`; read them before writing queries.
  - Crypto: `seal`/`open`/`encryptionConfigured` from `@/lib/server/crypto.server`.
  - Rate limits: `hit`/`LIMITS`/`clientSubject` from `@/lib/server/rate-limit.server`.
  - LLM: `complete`/`status` from `@/lib/server/llm`.
  - Feature flags: `features()` from `@/lib/server/config.server`.
- **Server routes (API):** `createFileRoute("/api/x")({ server: { handlers: { GET: async ({ request }) => ... } } })`. Copy the shape from `src/routes/api/auth/$.ts`.
- **Honesty:** when config is missing, show a clear "not configured" state. Never show mocked data, fake replies or invented numbers. Keep mlai's claim-discipline wording (VISION/ROADMAP labels, "not a benchmark").
- **Shared files you must NOT edit:**
  - `package.json`, `package-lock.json`, `src/routeTree.gen.ts`
  - `src/lib/content.ts` (nav/footer), `public/sitemap.xml`, `AGENTS*.md`
  - anything under `src/lib/auth/`, `migrations/`, `server/`, `public/__grok/`, `.grok/`, `.vercel/`

  If you need a dependency, a nav entry or a migration, list it in your report instead.
- **routeTree:** running `npx tsc --noEmit` needs new routes registered. Run `npx tsr generate` if it is available; otherwise do a short `npx vite build` and discard its output. Then `git checkout -- src/routeTree.gen.ts .vercel && git clean -fdq -- .vercel` before committing, and **never commit `routeTree.gen.ts` or `.vercel/`**.
- **Tests:** port mlai's vitest tests for the code you port. Put them next to the code as `*.test.ts(x)`, and run them with `npx vitest run <paths>`. Use the node environment; add `// @vitest-environment happy-dom` only if happy-dom is present (check `node_modules/happy-dom` first).
- **Gates before you commit:**
  - `npx tsc --noEmit` is clean. The only error you may leave is a route-registration error for your new routes, if you could not regenerate the tree.
  - `npx eslint <your files>` shows 0 errors.
  - Your vitest files are green.
- **Commit:** commit on your branch (`git add` only your owned paths) with a clear message ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push and do not merge.
- **Report (final message):**
  - branch and commit SHA
  - files added or changed
  - gap-matrix rows closed (quote the rows)
  - dependencies, nav entries and migrations you need
  - gate output with exact counts
  - what stays unmeasured (live credentials, and so on)
  - anything you deliberately did not port, and why
