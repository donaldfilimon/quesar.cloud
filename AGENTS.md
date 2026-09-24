# Project instructions (quesar.cloud)

Donald's standing rules for this repository. `CLAUDE.md` carries the command set and the architecture map; this file carries the decisions.

- **This is the main MLAI/Quesar site as of 2026-09-22.** It supersedes
  `donaldfilimon/MLAI-CORPORATION-WWW` (local checkout `~/dev/active/mlai`,
  Next 16), which is now the port source only. Port features from there, and
  don't build new site work in it.
- **No longer a Grok App Builder project (2026-09-23).** The repo began as a
  Grok export; its sandbox contract, platform chrome (PWA middleware, preview
  bridge, "Created with Grok" pill) and sandbox tooling were removed. Do not
  export from Grok into this repo again: an export would push the removed files
  back to `main`. Grok-generated media and attachments are kept under
  `notes/grok-export/`.
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
- Always `git fetch` before pushing, and never force-push.

## Merged from mlai (2026-09-22): deliberate deviations and runtime config

Spec: `notes/superpowers/specs/2026-09-22-mlai-merge-design.md`. Checklist: `notes/merge/gap-matrix.md`.

- **Google Drive and Microsoft SharePoint/OneDrive use our own OAuth connectors**
  (`/api/workspace/*`). These are _data connectors_, not sign-in methods.
- **Sign-in is first-party Better Auth (2026-09-23):** email/password,
  passkeys (`@better-auth/passkey`), and Google, Apple and X, each offered only
  once its credentials are set (`src/lib/auth/methods.server.ts`). No broker.
- **Admin** = `ADMIN_EMAILS` allowlist **plus** a linked Google or Apple
  account. An allowlisted email/password account is refused, because sign-up is
  open and unverified; X and passkeys never grant admin
  (`src/lib/server/admin.server.ts`, with tests proving each refusal).
- **Every app table is user-scoped by the Better Auth `user.id`.** WorkOS,
  organisations and MFA are retired.
- **Data at rest**: audits and workspace refresh tokens are sealed with
  AES-256-GCM under `APP_ENCRYPTION_KEY` (`src/lib/server/crypto.server.ts`).
  Without the key those features refuse; they never store plaintext.
- **One LLM interface**: `src/lib/server/llm` (xAI or the Cloudflare AI
  Gateway → Gemini). No provider means an honest "not configured" state.
- **Account deletion** (Donald authorized this edit on 2026-09-22): `src/lib/auth/server.ts` has
  `user.deleteUser` with a `beforeDelete` hook that calls `purgeUserData`
  (`src/lib/server/account-deletion.server.ts`), which revokes workspace grants
  and deletes per-user rows. Inquiries are unlinked, not deleted.
- **Static preview build** (`bun run build:static`, published from `docs/` by
  GitHub Pages): `VITE_STATIC_SITE=true` makes every server feature render
  `ServerOnlyNotice` instead of calling the server. The GitHub panels fetch
  GitHub's public API from the browser, and contact opens an email. `docs/`
  contains only the built site; internal records are in `notes/`.
- **Rate limits are database-backed** (`rate_limits` table), because serverless
  instances share no memory.

| Env var                                                                             | Feature                                                                                        | Missing means                                                                |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `XAI_API_KEY` / `CLOUDFLARE_AI_GATEWAY_URL`+`_TOKEN`+`_ID` / `LLM_PROVIDER`         | model calls                                                                                    | "model not configured"; desk answers from the catalog                        |
| `APP_ENCRYPTION_KEY` (32 bytes, `openssl rand -base64 32`)                          | audits, workspace tokens                                                                       | chat audits and workspace connect disabled                                   |
| `APP_ENCRYPTION_KEY_PREVIOUS`                                                       | key rotation                                                                                   | values sealed under the old key stop opening; connectors show "reconnect"    |
| `CRON_SECRET`                                                                       | daily audit expiry (`/api/cron/audits-expire`, scheduled in `vite.config.ts` → Vercel `crons`) | the job answers 503; expired audits are not deleted                          |
| `ADMIN_EMAILS`                                                                      | `/admin`                                                                                       | nobody is admin                                                              |
| `BETTER_AUTH_SECRET`                                                                | session signing                                                                                | a per-process random secret: sessions break across restarts and instances    |
| `BETTER_AUTH_URL`                                                                   | auth origin, passkey relying party                                                             | only the local `:8080` origins are trusted; passkeys use `localhost`         |
| `GOOGLE_SIGNIN_CLIENT_ID`/`_SECRET` (falls back to `GOOGLE_OAUTH_*`)                | Google sign-in                                                                                 | no Google button                                                             |
| `APPLE_CLIENT_ID`/`_TEAM_ID`/`_KEY_ID`/`_PRIVATE_KEY`                               | Apple sign-in (client secret minted from the key)                                              | no Apple button                                                              |
| `TWITTER_CLIENT_ID`/`_SECRET`                                                       | X sign-in                                                                                      | no X button                                                                  |
| `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID`/`_SECRET`/`_TENANT` | workspace sources                                                                              | connect buttons disabled                                                     |
| `STRIPE_PAYMENT_LINK`, `BILLING_PROVIDER`                                           | profile billing                                                                                | "billing not configured"                                                     |
| `TURNSTILE_SITE_KEY`/`_SECRET`/`_HOSTNAMES`                                         | contact form bot check                                                                         | form works without the challenge, rate-limited                               |
| `TRUSTED_PROXY=cloudflare`                                                          | per-IP rate limits and Turnstile read `cf-connecting-ip` (set only behind Cloudflare)          | only `x-real-ip`/`x-forwarded-for` (Vercel-set) are trusted                  |
| `QUASAR_SERVICE_ORIGIN`                                                             | Quasar screens default origin                                                                  | user sets the origin in `/quasar/settings`                                   |
| `DATABASE_URL`                                                                      | persistence                                                                                    | in-memory PGLite; **data does not survive a restart or serverless instance** |

Local dev: Better Auth trusts only the `:8080` origins unless `BETTER_AUTH_URL`
is set. If port 8080 is taken, run on another port with
`BETTER_AUTH_URL=http://localhost:<port>` passed through the environment;
otherwise email sign-up fails with "Invalid origin". `.env.local` is
git-ignored and fine for local values. The native shell's dependencies live in
`native/package.json`, outside the root build.
