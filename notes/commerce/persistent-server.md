# Persistent server artifact and operating boundary

`bun run build:persistent` selects Nitro's `node-server` preset and produces
`.output/server/index.mjs`, `.output/public/`, and `.output/nitro.json`. The
build copies PGLite runtime assets into `.output/server/_libs/`. Start the
artifact with Node 24 or newer using `NODE_ENV=production`, a loopback
`NITRO_HOST`, and the chosen `NITRO_PORT`; place an HTTPS reverse proxy in
front of it. Keep the build's `.output` tree intact. This is a source and
artifact recipe, not a selected host or a deployment record.

The persistent build refuses an inherited `VITE_STATIC_SITE=true` rather
than embedding the Pages-only server bypass. Its compiled persistent-mode
preflight requires production identity configuration even if the runtime
omits `NODE_ENV`; set `NODE_ENV=production` for the rest of Node's production
behavior as well.

The default `bun run build` still selects Vercel, including its cron
configuration. `bun run build:static` still builds GitHub Pages files in
`docs/` and cannot execute server functions. A persistent host must arrange
the audit-expiry job separately if that feature is used; the Vercel cron
declaration is not an operating scheduler for the Node artifact.

Before accepting production traffic, configure durable Postgres through
`DATABASE_URL` for Better Auth identity, application data and rate limits.
Provide a stable `BETTER_AUTH_SECRET` and the public HTTPS origin as
`BETTER_AUTH_URL`. Apply SQL migrations through the explicit
`bun run db:migrate` release step using the authorized database connection;
the build does not migrate. `/api/readiness` checks configuration shape only.
It does not establish database reachability, migration state, native WDBX
connectivity, or a working proxy. Missing required production identity
configuration makes all app requests return 503 before auth/database imports.

First-party invoices need the native WDBX executable on the same persistent
host as a dedicated private store. Set absolute paths for `WDBX_BINARY`,
`WDBX_COMMERCE_DIRECTORY` (existing mode 0700),
`WDBX_COMMERCE_CONFIG` (existing mode 0600), and
`WDBX_COMMERCE_HOST_KEY` (existing 32-byte binary key, mode 0600).
The executable must implement `wdbx typed inspect` and `wdbx typed commit`.
The host configuration must use schema `wdbx-typed-host-config-v1`, a 32-byte
namespace, current policy and consent 32-byte values and millisecond epoch
bounds, one stable service principal (32 bytes) and writer (16 bytes), and
historical epochs retaining that grant. Native host admission validates the
configuration, key and WAL. `APP_ENCRYPTION_KEY` is a separate application
AES key for sealed invoice snapshots. Provision and retain these inputs
through the chosen host's private operating process; this repository neither
creates production keys nor picks a host.

Back up the Postgres database and the WDBX store, host configuration and
required keys under separate protected access. Restore testing must prove
identity, invoice reads and WAL recovery together before cutover. Preserve
one WDBX writer; a stopped writer's admission lock requires operator review
and has no automatic stale takeover. Native typed-store version, journal,
value and invoice-discovery capacity limits are documented in
`manual-invoicing.md`; monitor them in operations. A persistent filesystem
and an executable installed for that host are mandatory; ephemeral
serverless storage is not a production commerce store.

Pilot invoices are for one scoped month at USD 2,500. Scope is agreed before
work starts. Payment is confirmed outside this application; only an
authorized administrator records an externally confirmed transaction
reference. There is no automatic charge, recurring billing, refund
execution, or hosted-model entitlement. Do not expose the native store,
private config, keys or Node listener directly to public clients.

The local artifact and loopback checks establish build shape and readiness
behavior only. Host selection, private configuration, database migrations,
backup restore, TLS/proxy validation, native connectivity and browser
acceptance remain separate operator gates before any backend cutover.
