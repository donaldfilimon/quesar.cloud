# Commerce browser acceptance — 2026-10-09

Current: the final focused Playwright run exited 0 with 6/6 tests passing in 36.0 seconds. It used real Chromium browser sessions, actual TanStack server-function HTTP transport, Better Auth, a dedicated disposable PostgreSQL 17 cluster on loopback port 55471, and the installed native WDBX typed CLI. The cluster, app process, browser contexts, per-run identity database, and temporary native ledger/config/key files were stopped and removed after the run. No existing database or invoice store was opened.

Command (requires a separately owned disposable cluster matching the acceptance guard):

```sh
QUESAR_BACKEND_ACCEPTANCE=1 QUESAR_ACCEPTANCE_ADMIN_URL=postgresql://quesar_fixture@127.0.0.1:55471/postgres bunx playwright test --config e2e/backend/commerce.config.ts
```

Installed WDBX executable SHA256: `9df92b8e28f7a68427dee7e77ee781ef6e75299793ac289f157d74f17d1a652b`.

Verified journeys:

1. Anonymous browser cannot create or list invoices; readiness declares native WDBX and manual invoicing.
2. Buyer creates a fixed USD 2500 invoice; same idempotency key returns the exact same invoice. Extra client-supplied monetary fields are rejected and create no extra invoice. Native WAL contains neither the actual buyer ID nor invoice description as plaintext.
3. Bystander list excludes buyer invoices; cross-user cancellation is refused. Buyer cancellation returns a cancelled invoice and replay returns the identical result.
4. Buyer and allowlisted password-only account cannot settle. After a synthetic trusted Google-account verification is inserted into the owned fixture database, real server authorization permits settlement and exact replay. Buyer cannot cancel a paid invoice.
5. Owned backend process is stopped and replaced with a fresh process. Existing browser cookies still authenticate, and the complete buyer invoice list (awaiting, cancelled, paid) matches exactly. Bystander isolation remains intact.
6. Actual Better Auth account deletion removes the buyer, invalidates the session, unlinks native invoice associations, and preserves bystander invoice state. Re-registering the same email creates a different user ID and sees no previous invoices. The old native invoice ledgers remain present as business receipts.

Proof limits: the admin verification fixture is trusted synthetic database evidence; this run does not exercise a real Google/Apple OAuth exchange. Manual settlement records a synthetic external-payment reference; no card processing, bank transfer, funds receipt, or production deployment is established. These six journeys do not replace the repository gate or static site/browser acceptance.

Test scaffolding corrections: initial signup waiting used a URL regex that also matched `login?next=/profile`; it now waits for the exact profile URL and populated profile field. A later run encountered Vite dependency optimization during the initial read-only import warmup; the suite now applies the existing durable suite's bounded warmup retry before any authentication/invoice mutations. Final journeys were single-shot and passed after the billing admission-lock/tombstone changes.

An earlier full unit run during active billing edits exited 1 with 749 passing and 4 failing tests, all caused by the in-progress directory lock release (`EISDIR`). The billing owner corrected that release. The final root-owned repository gate must establish the current full-suite result.
