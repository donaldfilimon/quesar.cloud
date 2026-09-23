# quesar.cloud modernization design (approved 2026-09-23): leave Grok, move to bun + TS, rebuild auth, modernize design

## Context

Donald asked to move npm → bun, convert all JS → TS, "modernize nextjs", apply modern design practices, and improve everything. Decisions already made in chat (2026-09-23):

- **Framework stays TanStack Start.** The only Next.js here is `sidecars/quasar-service/templates/next-site` (already Next 16.3; gets a small tidy).
- **Auth stays Better Auth** (Auth0 declined). Sign-in becomes **email/password + Google + Apple + X + passkeys**, all first-party, no Grok broker.
- **Cut Grok loose.** No more Grok App Builder exports into this repo. Its sandbox contract, platform chrome and tooling are removed, so bun and TS no longer collide with Grok re-exports.

Surveys found (evidence in this session's three Explore reports):
- **Grok coupling:**
  - The broker behind Google/X uses a committed `grok_preview` secret fallback (`src/lib/auth/preview.ts`). On a plain Vercel deploy the buttons render but fail, and nobody can become admin (`admin.server.ts` accepts only `grok-google`/`grok-x`).
  - `server/middleware/grok-pwa.ts` injects the Grok pill and overwrites og tags and the manifest on every HTML page.
  - `src/lib/app-data/`, PreviewHostBridge, the popup and gate-identity code, and about 15 sandbox-only scripts are unused by the site.
- **Bun is feasible:** bun 1.4.3 is installed, Vercel detects `bun.lock`, `overrides` carries over, and no native module blocks it. Run tools on Node via `bun run`, never `bun --bun`, and keep vitest as the single test runner.
- **Design/perf/a11y:** coherent oklch tokens, but:
  - every page's canonical points to `/`, and the static site has no OG tags;
  - light-mode `--fg-subtle` is 2.87:1 and the focus ring fails 3:1;
  - the home page preloads ~310 KB gzip of JS through the `@/lib/mlai` barrel plus client-side `Schema.parse`;
  - the shell remounts the route on every navigation and breaks scroll restoration;
  - 620 arbitrary Tailwind values; the mobile nav overflows on short phones;
  - the cinematic rAF loops ignore reduced motion; 37 lint warnings; 11 unused deps; `content.ts` duplicates `lib/mlai`.

## Approach: six phases, one PR each, merged in order

Each phase branches from fresh `main` (`git fetch` first), runs the gate, and merges before the next starts. That keeps every diff reviewable and every gate meaningful. First, land or close the open PR #2 (the `.remember/**` lint ignore); phase 1 keeps it either way.

The brainstorming spec goes in `notes/superpowers/specs/2026-09-23-quesar-modernization-design.md`, not `docs/`, which is the Pages output. Then a writing-plans implementation plan per phase goes in `notes/superpowers/plans/`.

### Phase 1: remove Grok (not auth)
- **Delete:**
  - `.grok/`, `startup.sh`, `.node_modules.lock`, `src/lib/app-data/`
  - PreviewHostBridge (`src/components/preview-host-bridge.tsx`, `src/lib/preview-host-bridge.ts`, `src/lib/preview-embedder-origin.ts`, the `__root.tsx` mount)
  - `server/` plus `scripts/grok-pwa-*`, `scripts/install-page.html`, `public/__grok/install/`
  - sandbox scripts and their tests (`browser-smoke*`, `brand-check`, `browser-guard`, `preview*`, `preview-thumbnail`, `write-atomic`, `check-auth-invariant`, `app-env-plugin`, `with-app-env`), plus the `check:auth` and `preview:*` package scripts and the now-unused `playwright` dep.
- **`vite.config.ts`:** drop `grokPwaPlugin`, `appEnvPlugin` and `serverDir`; keep `pgliteBootstrapPlugin` (renamed) and the Vercel cron. Call `vite` directly in scripts.
- **Replace the chrome:**
  - Move `public/__grok/icon-180.png` to `public/apple-touch-icon.png` and update `__root.tsx:31` and `src/lib/mlai/structured-data.ts:34`.
  - Add a static `public/manifest.webmanifest` and drop the strip step in `publish-static.mjs`.
  - Emit per-route canonical, og and twitter meta from `src/lib/seo.ts` `pageHead` (fixes the canonical bug on the static site as well).
- **CSP:** in `src/lib/server/csp.ts`, drop the grok origins, add `frame-ancestors 'self'`, and update `csp.test.ts`.
- **Tracked output:** untrack `.vercel/` (it's stale, with the Grok middleware baked in) and `screenshots/`, `artifacts/` and `attachments/` (move anything worth keeping to `notes/`). Add them to `.gitignore`.
- **Docs:** promote `AGENTS.project.md` to `AGENTS.md`. Rewrite `CLAUDE.md` (remove the Grok section and the `.vercel` restore step). Update the quesar.cloud row in `~/CLAUDE.md`. Rename the package from `app-builder-workspace`.

### Phase 2: first-party auth (Better Auth)
- **`src/lib/auth/server.ts`:**
  - Replace `genericOAuth` (broker) with `socialProviders: { google, apple, twitter }`.
  - Add the passkey plugin (package and API UNVERIFIED for better-auth ~1.6.30; check the installed docs and types first).
  - Remove the `bearer()` plugin, the gate-identity plugin, the preview fallback and the `__Host-grok-auth.*` cookie names (rename them to `__Host-quesar.*`, keeping the `__Host-` prefix).
  - Keep `deleteUser`, `cookieCache`, email/password and `accountLinking` (trusted: `google`, `apple`).
- **Delete** `preview.ts`, `popup.server.ts`, `gate-identity.server.ts`, `gate-session*.ts`, and the vite `authPopupPlugin`. Simplify `client.ts` (`signIn.social`, passkey client), `middleware.ts` (no bearer forwarding) and `verify.server.ts`.
- **Admin rule** (`admin.server.ts`): `VERIFIED_PROVIDERS = {"google","apple"}`. X and passkeys never grant admin; X may return no email. Update `admin.server.test.ts`.
- **UI:** the login page (`src/routes/login.tsx`, `src/lib/auth/gates.tsx`) shows only the providers whose credentials are configured. Configuration is computed per method, so there are no dead buttons. Add passkey sign-in and enrollment to the profile sessions card. Update the provider labels in `profile.ts` and `profile.tsx`.
- **Database:** add a new migration `migrations/0008_passkeys.sql` (the passkey table the plugin requires).
- **Config and tests:**
  - Env vars `GOOGLE_SIGNIN_CLIENT_ID`/`_SECRET` (or reuse the Drive client with a second redirect URI), `APPLE_CLIENT_ID`/`_TEAM_ID`/`_KEY_ID`/`_PRIVATE_KEY`, `TWITTER_CLIENT_ID`/`_SECRET`, and passkey `rpID` from `BETTER_AUTH_URL`.
  - Update `AGENTS.md`'s env table and `notes/deploy/secrets-checklist.md` (the claim that sign-in falls back to email is wrong).
  - Fix the tests that name `grok-*` ids (`console.server.test.ts`, `profile.test.ts`, `profile-cards.test.tsx`).
- **Public copy:** remove "Grok broker" from `src/lib/mlai/pages.ts:24,329,355`.

### Phase 3: bun + TypeScript + one test runner
- **Package manager:** run `bun install` (keeps `overrides.nf3`), delete `package-lock.json`, and replace `npm run` inside scripts with `bun run`. Add `engines.node: "24.x"` and a `vercel.json` with `installCommand: "bun install --frozen-lockfile"`.
- **TS conversion:** convert the remaining scripts. `migration-plan`, `migrate`, `copy-pglite-assets` and `publish-static` become `.ts`. `sign-out-plan` moves into `src/lib/auth/`. `eslint.config.mjs` becomes `.ts` if ESLint 9 loads it natively (verify). The scripts run through Node 24+ type stripping; add `erasableSyntaxOnly`.
- **tsconfig:** include `scripts` and the configs; remove `allowJs`/`checkJs`.
- **Tests:** vitest becomes the only runner. Include `scripts/**/*.test.ts`, drop the auth/app-data excludes, and port the node:test files (`t.mock.timers` → `vi.useFakeTimers`). Delete the `test` script and rename `test:app` → `test`.
- **Sub-projects:** `native/` switches to bun (its README install line and the `capacitor.settings.gradle` note). The sidecars are already bun.

### Phase 4: dependencies and lint debt
- **Remove unused deps:** vaul, react-day-picker, react-resizable-panels, zustand, @tanstack/react-table, @tanstack/react-query, the unused Radix avatar/checkbox/popover/slider/switch, and `jose`. Move `shadcn` to devDeps.
- **Clear all 37 lint warnings:** move shared constants and hooks out of component files; fix the 4 unused vars and the 3 exhaustive-deps warnings; remove the stale disable directive.
- **Version bumps:** minor bumps first. Then majors, one commit each with the gate run after each: lucide 1.x, recharts 3, @types/node, ESLint 10 + react-hooks 7, and TypeScript 7 last.
- **`components.json`:** set it to match reality (Radix, lucide).

### Phase 5: design, accessibility, performance (frontend-design skill)
- **Accessibility:**
  - Fix light-mode `--ring`, `--fg-subtle` and `--muted-foreground` to ≥4.5:1 text and ≥3:1 ring.
  - `ui/button|input|textarea`: remove `outline-none` and use a solid 2px ring.
  - Login: `aria-invalid`/`aria-describedby` and the destructive colour; password toggle gets `aria-pressed`; the theme toggle gets a fixed label.
- **Shell:** drop the `key={pathname}` remount and the manual `scrollTo` in `shell.tsx`, and use the router's `defaultViewTransition`. Check whether the `CinematicShell` portal is still required; keep it unless proven otherwise.
- **Performance:**
  - Stop importing the `@/lib/mlai` barrel on the home page, and move `Schema.parse` into tests.
  - Re-encode the atmosphere images as AVIF/WebP at 1280 px with sizes, `decoding` and `fetchpriority="low"`, and stop preloading decorative images.
  - Replace the per-frame React scroll progress with `animation-timeline: scroll()`.
  - Self-host JetBrains Mono and drop the Google Fonts domains from the CSP.
- **Tokens:** add a small type scale plus tracking and radius tokens to `@theme`, codemod the ~300 arbitrary usages, and delete the dead/duplicate CSS (`.nav-link` ×2, `.scroll-progress`, `.pulse-dot`, `.hero-trailer`, `.search-dialog`, `.faq`).
- **Mobile nav:** a Radix Dialog sheet with scroll lock, Escape and `max-h` + overflow.
- **Cinematic:** gate the rAF loops on reduced motion and visibility (`BrandBoard`, `LabBoard`, `ShowcaseBoard`, `GalaxyCanvas`), and map `.mlai-ds` tokens onto the site's oklch tokens.
- **Home page:** cut from ~20 sections to ~8, with one CTA pair, fewer hero layers and a concrete H1. The copy direction gets its own short design check with Donald before editing.
- **Content:** merge `src/lib/content.ts` into `src/lib/mlai/categories/*` as the single source.

### Phase 6: Quasar Next.js template tidy
- In `sidecars/quasar-service/templates/next-site`:
  - config: target ES2022, `@types/react-dom`, the eslint-config-next flat config, `reactCompiler: true`;
  - page shell: full `metadata`/`viewport`, `min-h-dvh`;
  - optionally the site's tokens.
- Run the sidecar's own `bun test src shared`.

## Parallelism
Phases 1→2→3 must run in order (shared files: `vite.config.ts`, `package.json`, `src/lib/auth`). Inside phase 5, the independent surfaces (a11y/tokens, perf/images, mobile nav, cinematic loops, content merge) can go to parallel agents per the dispatching-parallel-agents skill, after the token change lands first. Phase 6 is independent and can run in parallel with any phase.

## Verification (each phase)
- **Gate:** `typecheck`, `lint` (0 errors, and 0 warnings from phase 4 on), `test` (vitest), `build`, and `build:static`. Diff `docs/` for unexpected changes. Exit codes are captured into logs, never piped.
- **Built-in browser pane:** start the dev server and the static build.
  - Check the console for errors and no `grok.com` requests, and look for correct canonical/og tags per page (`read_page`).
  - Mobile at 375 px: nav reachable, no horizontal scroll. Light and dark contrast.
  - Screenshot proof.
- **Phase 2:** exercise email sign-up/sign-in and passkey enrollment/sign-in locally (PGLite). The Google/Apple/X buttons stay hidden until credentials exist. Admin refusal and grant are proven by `admin.server.test.ts`. Real OAuth round-trips need Donald's Google, Apple Developer and X apps; that's reported as unverified until then.
- **Phase 3:** `bun install --frozen-lockfile` from clean; the PGLite assets exist after `build`.
- **Phase 5:** Lighthouse-style checks through the browser pane (home-page JS weight before/after, contrast ratios computed from tokens).

## Needs Donald (not blockers for phase 1)
Creating the Google, Apple (Services ID, key) and X OAuth apps and setting their secrets; setting up Vercel/Neon. No secret values are ever written by Claude.
