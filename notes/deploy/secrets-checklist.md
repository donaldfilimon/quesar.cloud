# Server deployment: secrets and settings checklist

This checklist is for Donald. Claude sets no secret values.

The static preview on GitHub Pages needs **none** of these. They are for the server deployment, planned as a Vercel project linked to `donaldfilimon/quesar.cloud`, which runs `npm run build` (Vercel preset, cron included). Each value goes in with `vercel env add <NAME> production`, or in the Vercel dashboard under Project → Settings → Environment Variables.

| Variable | Needed for | How to get it |
|---|---|---|
| `DATABASE_URL` | all persistence (without it data is in-memory and lost) | Vercel Marketplace → Neon Postgres, which injects it. Migrations run during `npm run build`. |
| `BETTER_AUTH_SECRET` | signing sessions | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | auth origin and passkey relying party | `https://quesar.cloud`, the production origin. Passkeys bind to this host name, so passkeys registered under one host do not work under another. |
| `APP_ENCRYPTION_KEY` | sealed audits and workspace tokens | `openssl rand -base64 32`. **Back it up.** Losing it strands every sealed value. |
| `APP_ENCRYPTION_KEY_PREVIOUS` | key rotation only | the old key while you rotate |
| `CRON_SECRET` | the daily audit-expiry cron | `openssl rand -hex 32`. Vercel sends it automatically. |
| `ADMIN_EMAILS` | `/admin` | comma-separated. The account must also have a linked Google or Apple sign-in; X and passkeys do not count. |
| `XAI_API_KEY` *or* `CLOUDFLARE_AI_GATEWAY_URL` + `_TOKEN` + `_ID` | model calls | xAI console, or a Cloudflare AI Gateway with a Google AI Studio key. Optional `LLM_PROVIDER=xai\|gemini`. |
| `GOOGLE_SIGNIN_CLIENT_ID` / `_SECRET` | "Continue with Google" | Optional: without it, sign-in reuses the Drive client below. Either way, add the redirect URI `https://quesar.cloud/api/auth/callback/google` to the OAuth client (scopes `openid email profile`). |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | "Continue with Apple" | Apple Developer → Identifiers → a **Services ID** (this is `APPLE_CLIENT_ID`) with Sign in with Apple enabled, domain `quesar.cloud`, return URL `https://quesar.cloud/api/auth/callback/apple`. Keys → a key with Sign in with Apple → download the `.p8` (its contents are `APPLE_PRIVATE_KEY`; `\n`-escaped is fine) and note its Key ID and your Team ID. The app mints Apple's client-secret JWT from these itself. Apple posts back from `https://appleid.apple.com`, which the server trusts automatically when Apple is configured. |
| `TWITTER_CLIENT_ID` / `_SECRET` | "Continue with X" | developer.x.com → a project app → User authentication settings → OAuth 2.0, type Web App, callback `https://quesar.cloud/api/auth/callback/twitter`, then copy the OAuth 2.0 client id and secret. |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | Google Drive source | Google Cloud Console → Credentials → OAuth client (Web). Redirect URI `https://quesar.cloud/api/workspace/callback/google`. On the consent screen, add the scope `https://www.googleapis.com/auth/drive.metadata.readonly` and enable the Drive API. |
| `MICROSOFT_OAUTH_CLIENT_ID` / `_SECRET` / `_TENANT` | SharePoint/OneDrive source | Entra ID → App registrations → Web redirect `https://quesar.cloud/api/workspace/callback/microsoft`. Delegated permissions `Files.Read.All`, `User.Read`, `offline_access`. **The client secret expires**: diarise the renewal. Tenant defaults to `common`. |
| `STRIPE_PAYMENT_LINK`, `BILLING_PROVIDER` | profile billing | a Stripe Payment Link (https) |
| `TURNSTILE_SITE_KEY` / `_SECRET` / `_HOSTNAMES` | contact form bot check | Cloudflare Turnstile widget for `quesar.cloud`. All three are needed, otherwise the form refuses inquiries as "misconfigured". |
| `QUASAR_SERVICE_ORIGIN` | default origin for the Quasar screens | optional |

Sign-in methods appear only when their credentials exist: email/password and passkeys are always on (with a server); each of Google, Apple and X shows up once its variables are set, so a partly configured deployment never shows a button that fails.

**Order when the server deployment goes live:** create the Vercel project, add Neon, set the variables above, deploy, and check `/login`, `/console` and `/admin`. Then move the `quesar.cloud` domain from GitHub Pages to Vercel.
