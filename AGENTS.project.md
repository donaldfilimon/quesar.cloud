# Project instructions (quesar.cloud)

These are Donald's standing instructions. Grok's `AGENTS.md` loads this file with equal priority.

- **This is the main MLAI/Quesar site as of 2026-09-22.** It supersedes
  `donaldfilimon/MLAI-CORPORATION-WWW` (local checkout `~/dev/active/mlai`,
  Next 16), which is now the port source only. Port features from there, and
  don't build new site work in it.
- **The cinematic showcase lives in `src/cinematic/`.** It was ported from
  `mlai/apps/mlai/src/{film,trailer,abbey-trailer,explainer,mega,design}` plus
  `components/CinematicShell.tsx`. The playback core is
  `src/lib/trailer-engine/`, vendored from `mlai/packages/trailer-engine`. The
  six `/showcase/*` rooms are `ssr: false` routes that lazy-load
  `src/cinematic/rooms/<room>.tsx`. `src/components/site/trailer.tsx` (the MP4
  player) remains the `/showcase` and home teaser.
- `CinematicShell` portals to `<body>`, because the route wrapper
  `.page-enter` keeps a transform that would trap `position: fixed`. Keep the
  portal.
- Narration loads Kokoro TTS from jsdelivr at runtime and falls back to Web
  Speech. The films are orientation, not benchmarks, so keep their
  VISION/ROADMAP labels.
- Local development: `npm ci`, then `npm run typecheck`, `npm run lint` and
  `npm run build`.
  - The 13 `npm test` failures in `scripts/*.test.mjs` are Grok-sandbox
    template tests. They fail on macOS with or without app changes.
  - `npm run build` rewrites the tracked `.vercel/output/`. Never commit it by
    accident.
- Grok exports push to `main`. Always `git fetch` before pushing, and never
  force-push.

## Merged from mlai (2026-09-22): deliberate deviations and runtime config

Spec: `notes/superpowers/specs/2026-09-22-mlai-merge-design.md`. Checklist: `notes/merge/gap-matrix.md`.

- **Google Drive and Microsoft SharePoint/OneDrive use our own OAuth connectors**
  (`/api/workspace/*`). This is Donald's explicit override of the `app-data` rule.
  These are *data connectors*, not sign-in methods: sign-in stays limited to the
  broker (Google, X) plus email/password. Don't "fix" them into app-data.
- **Admin** = `ADMIN_EMAILS` allowlist **plus** a broker-linked account
  (`grok-google`/`grok-x`). An allowlisted email/password account is refused,
  because sign-up is open and unverified (`src/lib/server/admin.server.ts`, with a
  test proving the refusal).
- **Every app table is user-scoped by the Better Auth `user.id`.** WorkOS,
  organisations and MFA are retired.
- **Data at rest**: audits and workspace refresh tokens are sealed with
  AES-256-GCM under `APP_ENCRYPTION_KEY` (`src/lib/server/crypto.server.ts`).
  Without the key those features refuse; they never store plaintext.
- **One LLM interface**: `src/lib/server/llm` (xAI or the Cloudflare AI
  Gateway → Gemini). No provider means an honest "not configured" state.
- **Account deletion** (Donald authorized this edit on 2026-09-22): `src/lib/auth/server.ts` gained one
  additive block, `user.deleteUser` with a `beforeDelete` hook. The hook calls
  `purgeUserData` (`src/lib/server/account-deletion.server.ts`), which revokes
  workspace grants and deletes per-user rows. Inquiries are unlinked, not
  deleted. Nothing else in that file was changed.
- **Static preview build** (`npm run build:static`, published from `docs/` by
  GitHub Pages): `VITE_STATIC_SITE=true` makes every server feature render
  `ServerOnlyNotice` instead of calling the server. The GitHub panels fetch
  GitHub's public API from the browser, and contact opens an email. `docs/`
  contains only the built site; internal records are in `notes/`.
- **Rate limits are database-backed** (`rate_limits` table), because serverless
  instances share no memory.

| Env var | Feature | Missing means |
|---|---|---|
| `XAI_API_KEY` / `CLOUDFLARE_AI_GATEWAY_URL`+`_TOKEN`+`_ID` / `LLM_PROVIDER` | model calls | "model not configured"; desk answers from the catalog |
| `APP_ENCRYPTION_KEY` (32 bytes, `openssl rand -base64 32`) | audits, workspace tokens | chat audits and workspace connect disabled |
| `APP_ENCRYPTION_KEY_PREVIOUS` | key rotation | values sealed under the old key stop opening; connectors show "reconnect" |
| `CRON_SECRET` | daily audit expiry (`/api/cron/audits-expire`, scheduled in `vite.config.ts` → Vercel `crons`) | the job answers 503; expired audits are not deleted |
| `ADMIN_EMAILS` | `/admin` | nobody is admin |
| `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID`/`_SECRET`/`_TENANT` | workspace sources | connect buttons disabled |
| `STRIPE_PAYMENT_LINK`, `BILLING_PROVIDER` | profile billing | "billing not configured" |
| `TURNSTILE_SITE_KEY`/`_SECRET`/`_HOSTNAMES` | contact form bot check | form works without the challenge, rate-limited |
| `QUASAR_SERVICE_ORIGIN` | Quasar screens default origin | user sets the origin in `/quasar/settings` |
| `DATABASE_URL` | persistence | in-memory PGLite; **data does not survive a restart or serverless instance** |

Tests: `npm run test:app` (vitest; app code). `npm test` is Grok's template suite.

Local dev: Better Auth trusts only the `:8080` origins unless `BETTER_AUTH_URL`
is set. If port 8080 is taken, run on another port with
`BETTER_AUTH_URL=http://localhost:<port>` passed through the environment (not
`.env`); otherwise email sign-up fails with "Invalid origin". The native shell's
dependencies live in `native/package.json`, outside the root build.
