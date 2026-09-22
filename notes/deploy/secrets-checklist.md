# Server deployment: secrets and settings checklist

This checklist is for Donald. Claude sets no secret values.

The static preview on GitHub Pages needs **none** of these. They are for the server deployment, planned as a Vercel project linked to `donaldfilimon/quesar.cloud`, which runs `npm run build` (Vercel preset, cron included). Each value goes in with `vercel env add <NAME> production`, or in the Vercel dashboard under Project → Settings → Environment Variables.

| Variable | Needed for | How to get it |
|---|---|---|
| `DATABASE_URL` | all persistence (without it data is in-memory and lost) | Vercel Marketplace → Neon Postgres, which injects it. Migrations run during `npm run build`. |
| `BETTER_AUTH_SECRET` | signing sessions | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | auth origin | `https://quesar.cloud`, the production origin |
| `APP_ENCRYPTION_KEY` | sealed audits and workspace tokens | `openssl rand -base64 32`. **Back it up.** Losing it strands every sealed value. |
| `APP_ENCRYPTION_KEY_PREVIOUS` | key rotation only | the old key while you rotate |
| `CRON_SECRET` | the daily audit-expiry cron | `openssl rand -hex 32`. Vercel sends it automatically. |
| `ADMIN_EMAILS` | `/admin` | comma-separated. The account must also sign in through Google or X. |
| `XAI_API_KEY` *or* `CLOUDFLARE_AI_GATEWAY_URL` + `_TOKEN` + `_ID` | model calls | xAI console, or a Cloudflare AI Gateway with a Google AI Studio key. Optional `LLM_PROVIDER=xai\|gemini`. |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | Google Drive source | Google Cloud Console → Credentials → OAuth client (Web). Redirect URI `https://quesar.cloud/api/workspace/callback/google`. On the consent screen, add the scope `https://www.googleapis.com/auth/drive.metadata.readonly` and enable the Drive API. |
| `MICROSOFT_OAUTH_CLIENT_ID` / `_SECRET` / `_TENANT` | SharePoint/OneDrive source | Entra ID → App registrations → Web redirect `https://quesar.cloud/api/workspace/callback/microsoft`. Delegated permissions `Files.Read.All`, `User.Read`, `offline_access`. **The client secret expires**: diarise the renewal. Tenant defaults to `common`. |
| `STRIPE_PAYMENT_LINK`, `BILLING_PROVIDER` | profile billing | a Stripe Payment Link (https) |
| `TURNSTILE_SITE_KEY` / `_SECRET` / `_HOSTNAMES` | contact form bot check | Cloudflare Turnstile widget for `quesar.cloud`. All three are needed, otherwise the form refuses inquiries as "misconfigured". |
| `QUASAR_SERVICE_ORIGIN` | default origin for the Quasar screens | optional |

The Grok broker sign-in (`GROK_AUTH_*`) is injected only by Grok's own publishing. On Vercel, sign-in is email and password unless the broker credentials are provided.

**Order when the server deployment goes live:** create the Vercel project, add Neon, set the variables above, deploy, and check `/login`, `/console` and `/admin`. Then move the `quesar.cloud` domain from GitHub Pages to Vercel.
