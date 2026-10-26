# quesar.cloud

The MLAI/Quesar website and showcase application, with research content,
project documentation, cinematic presentations, and optional server-backed
account and workspace features.

**This repository is the website, not the Quesar foundation model.** In LYLX by
The Donald Company, Quesar is the largest shared model; Abbey and Aviva are its
consolidated personality direction; ABI handles dynamic moderation/routing and
authorized execution; WDBX 3D provides neural memory and storage. Website pages
and films describe that direction but do not establish trained weights,
benchmark results, or completed runtime integration.

## Quick start

Use the repository's declared toolchain: **Bun 1.4.2 or newer** and **Node.js 24
or newer**. `packageManager` pins Bun 1.4.2, and `bun.lock` is the dependency
lockfile. Do not introduce an npm lockfile or change toolchain pins as part of
setup.

```bash
bun install --frozen-lockfile
bun run dev
```

Development runs the Next.js dev server (server mode) on port **8080**. It binds
`0.0.0.0`, so use a trusted development network and do not expose it as a
production service. If changing the port or origin, also configure
`BETTER_AUTH_URL` as described in [AGENTS.md](AGENTS.md).

Use `bun run test`, not bare `bun test`: the configured test runner is Vitest.
The project scripts use Node where declared; do not substitute `bun --bun`.

## Two delivery modes

| Mode                          | Build                  | Boundary                                                                                                                                            |
| ----------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full server application       | `bun run build`        | Next.js server build (`.next-server/`, Vercel) with optional configured auth, database, connectors, and model providers. Building is not deploying. |
| Static research/showcase site | `bun run build:static` | Next.js static export published under `docs/`; server-only features show explicit unavailable notices.                                              |

The repository's publishing guidance identifies GitHub Pages from `main:/docs`
as the static-site path. This README does not independently verify the live
service. **`docs/` is generated output: never hand-edit it.** Internal records
belong in `notes/`. Follow the existing `quesar-static-publish` project skill for
an intentional site publication; a documentation-only change is not a request
to rebuild or publish the website.

## Architecture

| Area                                                | Source                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Route modules (`createFileRoute`) and server routes | `src/routes/`, generated into `app/` by `scripts/next-routes.ts`       |
| Router, server functions and their Next.js wiring   | `src/framework/`, `next.config.ts`, `proxy.server.ts`                  |
| Site UI and explicit server-only notices            | `src/components/site/`                                                 |
| Typed project/research content                      | `src/lib/site-identity.ts`, `src/lib/home-content.ts`, `src/lib/mlai/` |
| Cinematic showcase                                  | `src/cinematic/`, with playback support in `src/lib/trailer-engine/`   |
| First-party authentication                          | `src/lib/auth/`                                                        |
| Server services and model-provider interface        | `src/lib/server/`, including `llm/`                                    |
| Database and release migrations                     | `src/lib/db.ts`, `migrations/`, `scripts/migrate.ts`                   |
| Native shell                                        | `native/`, with its own package and dependency boundary                |

The site uses React, TypeScript, Next.js (App Router, webpack) and Tailwind. Read
[`package.json`](package.json) for exact versions and scripts rather than
inferring the stack from older project descriptions.

## Verification

```bash
bun run check
```

The gate runs formatting, type checking, linting, Vitest, and the server build.
For changes that affect the static site, also run:

```bash
bun run build:static
bun run check:static
bun run test:e2e
```

These commands describe required checks; they are not a claim that this commit
has passed them. Browser acceptance, generated-asset verification, live auth,
model-provider availability, and a deployment are separate evidence.

Useful additional commands are `bun run start` (serves the last server build),
`bun run check:parity`,
`bun run check:research-drift`, and `bun run export:research-site`.
Research drift is report-only. Review [CLAUDE.md](CLAUDE.md) for the complete
command map and output locations.

## Configuration and data safety

Start with the environment table in [AGENTS.md](AGENTS.md). In particular:

- Without `DATABASE_URL`, the default in-memory PGLite data does **not** survive
  a restart or a new serverless instance. Persistent deployments need an
  explicitly configured and qualified database.
- `bun run db:migrate` is an explicit state-changing release step, not part of
  `bun run build`. Never run it against an unintended database.
- Authentication, encryption, workspace OAuth, and model providers require
  their own configuration. Missing providers must remain visibly unconfigured;
  they must not be represented as local Quesar inference.
- Keep secrets in private environment configuration, never in committed files,
  screenshots, or public reports. Do not weaken user scoping, auth, or origin
  checks to make a demonstration appear functional.

The complete account, provider, encryption, and administration boundaries are
specified in `AGENTS.md` and the server sources. Static previews do not prove
those live paths work.

## Content and provenance

Keep VISION/ROADMAP labels on cinematic explanations. Source-backed capability
statuses belong in the typed content records; do not promote research to
"current" because a presentation renders successfully.

This is no longer a Grok App Builder project. Do not re-export an older builder
snapshot into this source tree. The earlier MLAI site was consolidated here;
follow the recorded migration history instead of reviving the retired site.

Related projects: [ABI](https://github.com/donaldfilimon/abi),
[Abbey](https://github.com/donaldfilimon/abbey),
[WDBX](https://github.com/donaldfilimon/wdbx), and
[NYON](https://github.com/donaldfilimon/NYON).

## Contributing

Read [AGENTS.md](AGENTS.md) first, then [CLAUDE.md](CLAUDE.md). Preserve the
server/client boundary, generated files, static-mode behavior, and data-access
controls. Fetch current repository state before pushing, never force-push, and
report checks that were not run alongside those that passed.
