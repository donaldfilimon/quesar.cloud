# Quasar service (sidecar)

A local Bun service that turns a prompt into a real Next.js 16 project on your
own machine: it scaffolds a site from `templates/next-site`, drives Claude over
three path-guarded tools (`list_files`, `read_file`, `write_file`), and runs a
protected Next development preview per site. quesar.cloud's `/quasar/*` screens are its client.
It is a standalone Bun project, **not** part of the npm build: the root
`tsconfig.json` (`src`, `server`), the root Vitest config (`src/**`) and the
Vercel build never read this directory.

## Provenance

Copied on 2026-09-22 from `donaldfilimon/MLAI-CORPORATION-WWW` at
`b6f3686b7316b1afcc5c780611c47f51750a26ae` (committed files only, via
`git archive`):

| mlai path | here |
|---|---|
| `apps/quasar/packages/service/src/` | `src/` |
| `apps/quasar/packages/shared/src/` (`@quasar/shared`) | `shared/` |
| `apps/quasar/templates/next-site/` | `templates/next-site/` (own `package.json` and `bun.lock`, copied per site) |
| `apps/quasar/docs/` (v1 design spec, plan, journey receipt) | `docs/` |

Original merge changes:

- The two workspace packages became one project. `@quasar/shared` is now the
  relative import `../shared/index`, and `package.json` merges both packages'
  dependencies (zod takes the service's `^3.25.0`).
- `src/index.ts` finds the template at `../templates/next-site` (it was
  `../../../templates/next-site`).
- `tsconfig.json` inlines mlai's `apps/quasar/tsconfig.base.json` and adds
  `shared` to `include`.

Dependency refresh (2026-09-28): the service uses TypeScript 7.0.2 and the
Anthropic SDK 0.129.0; type checking and all 69 tests pass. The Next template
uses Next 16.3.6 and React 19.3.0. It retains TypeScript 6 and ESLint 9 because
the current Next React lint plugin fails with ESLint 10. Its typecheck, lint,
and production build pass. These checks do not certify live provider calls.

Not copied: the Expo app (`apps/quasar/apps/quasar`, replaced by quesar's
`/quasar/*` routes), `scripts/verify-journeys.ts` (it drives that Expo export
through a Playwright environment that no longer exists), and
`tasks/todo.md`.

## Run

```bash
cd sidecars/quasar-service
bun install          # its own bun.lock; node_modules is gitignored
bun run start        # or: bun run dev (restarts on change)
bun run test         # bun:test service/shared cases; installed Next smoke when available
bun run typecheck
```

| Env var | Default | Meaning |
|---|---|---|
| `PORT` | `4700` | service port |
| `QUASAR_HOME` | `~/.quasar` | registry, sites, and operator-owned mode-0600 `pairing-token` |
| `QUASAR_PAIRING_TOKEN` | generated persistent file | optional 43+ character base64url override; never printed |
| `QUASAR_HOST` | `127.0.0.1` | listener host; non-loopback requires explicit opt-in |
| `QUASAR_ALLOW_NETWORK` | false | set `true` to allow a non-loopback listener |
| `QUASAR_PUBLIC_ORIGIN` | local listener origin | required for non-loopback exposure; remote origins must use HTTPS |
| `QUASAR_ALLOWED_ORIGINS` | `http://localhost:8080,http://127.0.0.1:8080,https://quesar.cloud` | comma-separated exact browser origins; no wildcard |
| `QUASAR_PREVIEW_DOMAIN` | none | remote preview DNS suffix, e.g. `preview.example.com`; requires wildcard DNS/TLS and HTTPS service origin |
| `ANTHROPIC_API_KEY` | none | service-side Claude credentials; missing credentials fail generation explicitly |

## Pairing and transport

The browser settings explicitly save a pairing token for one exact service origin.
The operator retrieves it from the protected `QUASAR_HOME/pairing-token` file or
the configured environment override. The UI masks input and offers online
**Unpair and revoke previews** and **Forget locally**. Local forgetting cannot
revoke sessions in an unreachable service; they expire after 30 minutes or a
service restart. Unpair revokes all preview sessions for this operator service,
then removes this browser's saved credential. It does not rotate the shared
operator token or revoke credentials saved by other browsers.

All `/api/*` data, generation, event and preview operations require bearer auth.
`GET /health` returns only availability. Browser origins, Host and preflight
methods/headers are checked exactly; start/stop are POST-only. The service binds
loopback by default. Pairing credentials are refused over non-loopback HTTP.
Remote HTTPS needs an operator-managed TLS proxy; this Bun listener itself is
HTTP. No DNS or TLS provisioning occurs automatically.

Previews open through a user-initiated POST form with a 30-second one-use ticket.
The service sets a host-only HttpOnly SameSite=Lax session cookie and redirects to
`/preview/<site-id>/`. Each local site has a distinct
`http://<site-id>.localhost:<service-port>` browser origin; generated code cannot
read another site's preview through shared-origin access. Remote previews use
`https://<site-id>.<QUASAR_PREVIEW_DOMAIN>` on the public service port. Configure
wildcard DNS/TLS and forward those hosts to the service while preserving Host.
Remote launch fails closed without a valid suffix. Preview responses have no
CORS grant; upgrades require the exact preview Origin and a current session.
Stop, delete, restart and online unpair revoke preview sessions; live sockets
close on revocation or expiry. Tickets, sessions and live transport checks are
bound to one child generation, and teardown invalidates transport before
awaiting child exit. Delayed requests cannot authorize a replacement child.

Preview children bind 127.0.0.1 on ports 4710 and up, with a random per-child
credential checked before every HTTP request and WebSocket upgrade. The runner
removes that header before invoking Next. Child environments contain only
selected OS variables and preview configuration, excluding provider and pairing
secrets. Generated project code still runs as the operator; this transport gate
is not an operating-system sandbox.

The runner uses installed Next 16.3.6 request/upgrade handlers directly because
its ordinary custom-server API can register an additional unguarded upgrade
listener. The template retains its config and supplies basePath/assetPrefix from
`QUASAR_PREVIEW_BASE_PATH`. Existing or edited projects that remove that contract
fail to start with a configuration error; restore those two config fields before
retrying. Future Next upgrades require rerunning the real HTTP/assets/HMR and
browser live-edit qualification.

## Browser client

The `/quasar/*` screens call the service directly from the browser. Their service
origin and origin-scoped credential stay in device storage; a configured
`QUASAR_SERVICE_ORIGIN` provides a fallback origin. Browser private-network
permission and HTTPS-to-loopback policies still apply. Remote service and preview
origins require the operator's HTTPS setup.

The service and browser vendor the same connection contract in `shared/connection.ts`
and `src/lib/quasar/connection.ts`. Keep pairing, cancellation and schema behavior
aligned when changing either copy. The standard service test gate includes the
real Next smoke when template dependencies are installed; a skipped smoke is not
proof of preview compatibility.

## Not verified

A real end-to-end generation against the live Anthropic API has never run in
this repository or in mlai. The engine's tool loop, path guard and error
mapping are tested against a mocked client and local stub servers only.
