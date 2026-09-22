# Quasar service (sidecar)

A local Bun service that turns a prompt into a real Next.js 16 project on your
own machine: it scaffolds a site from `templates/next-site`, drives Claude over
three path-guarded tools (`list_files`, `read_file`, `write_file`), and runs a
`next dev` preview per site. quesar.cloud's `/quasar/*` screens are its client.
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

Changes from the source, and nothing else:

- The two workspace packages became one project. `@quasar/shared` is now the
  relative import `../shared/index`, and `package.json` merges both packages'
  dependencies (zod takes the service's `^3.25.0`).
- `src/index.ts` finds the template at `../templates/next-site` (it was
  `../../../templates/next-site`).
- `tsconfig.json` inlines mlai's `apps/quasar/tsconfig.base.json` and adds
  `shared` to `include`.

Not copied: the Expo app (`apps/quasar/apps/quasar`, replaced by quesar's
`/quasar/*` routes), `scripts/verify-journeys.ts` (it drives that Expo export
through a Playwright environment that no longer exists), and
`tasks/todo.md`.

## Run

```bash
cd sidecars/quasar-service
bun install          # its own bun.lock; node_modules is gitignored
bun run start        # or: bun run dev (restarts on change)
bun test             # 69 bun:test cases across 11 files, no credentials needed
bun run typecheck
```

| Env var | Default | Meaning |
|---|---|---|
| `PORT` | `4700` | service port |
| `QUASAR_HOME` | `~/.quasar` | registry JSON plus one Next.js project per site |
| `ANTHROPIC_API_KEY` | none | Claude credentials; `ant auth login` works instead. The service never stores or proxies a key of its own. Without either, generation fails with a clear credentials message. |

Previews listen on ports 4710 and up.

## How quesar.cloud reaches it

The `/quasar/*` screens (merge workstream F) call this service **from the
browser**, at the origin saved on the `/quasar/settings` screen (device
storage), falling back to the `QUASAR_SERVICE_ORIGIN` env var. The shared client's
own default origin is `http://localhost:4700` (`shared/connection.ts`). The browser
side vendors its own copy of the `shared/` types and schemas under
`src/lib/quasar/`; that copy and `shared/` are one wire contract, so change
them together.

The API is JSON over HTTP (`src/server.ts`): `GET`/`POST /api/sites`,
`GET`/`DELETE /api/sites/:id`, `POST /api/sites/:id/edit`,
`GET /api/sites/:id/events?since=N` (a polled cursor, not SSE), and
`/api/sites/:id/preview`, `/preview/start` and `/preview/stop`.

Unmeasured here: calling `http://<lan-ip>:4700` from the HTTPS production
site is mixed content, which browsers block; `http://localhost` is treated as
a secure origin by current Chromium and Firefox. Local-network access prompts
in newer browsers may also apply. Use the local dev server, or put the service
behind HTTPS, when the page and the service are on different machines.

## Security: run it only on a network you trust

- **There is no auth.** Anyone who can reach port 4700 can create, edit and
  delete sites and spend your Anthropic credits.
- **CORS is wide open (`Access-Control-Allow-Origin: *`).** That is a wider
  hole than "any LAN peer": any web page open in any browser on your LAN can
  drive the service with a cross-origin `fetch`.
- **Every listener is on all interfaces, on purpose.** The service
  (`Bun.serve` with no hostname) and each `next dev` preview bind every
  interface so a phone on the LAN can reach them. Stop the service when you
  are done.

## Not verified

A real end-to-end generation against the live Anthropic API has never run in
this repository or in mlai. The engine's tool loop, path guard and error
mapping are tested against a mocked client and local stub servers only.
