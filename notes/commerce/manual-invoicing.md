# First-party WDBX invoicing

The backend creates a Pilot invoice for one scoped month at USD 2,500 (250000 minor units). Scope must be agreed before work starts. The invoice grants no hosted model entitlement and does not renew or charge automatically. Platform engagements use contact sales.

`src/lib/commerce.ts` exposes authenticated TanStack server functions:

- `createPilotOrder({ data: { idempotencyKey } })`: retain a UUID across network retries. The buyer/key derives the stable invoice identifier. The server sets product, description, currency and amount. Creation is limited to 20 requests per hour per authenticated user.
- `listCommerceOrders()`: returns only the authenticated buyer's current invoices.
- `cancelCommerceOrder({ data: { orderId } })`: buyer may cancel their awaiting-payment invoice. Repeated cancellation is idempotent.
- `adminSettleCommerceOrder({ data: { orderId, paymentReference } })`: administrator records an externally confirmed payment. Authorization uses the existing ADMIN_EMAILS plus verified Google/Apple linked identity rule. An ordinary buyer cannot mark an invoice paid. The reference must be 3–160 characters; use an external transaction identifier, never card, bank-account or credential data. Retrying the same administrator/reference is idempotent.
- `getCommerceReadiness()`: configuration readiness only; it does not prove native connectivity, configured grants or database connectivity. Storage is declared `wdbx`.

Money, invoices and settlement audit facts have exactly one authority: WDBX typed ledgers. There is no SQL finance mirror or commerce migration. Each invoice has a private directory and one AES-256-GCM sealed current snapshot, bound to that invoice identifier with authenticated additional data. Native WDBX synced WAL commits, HMAC host admission assertions and single-writer sequence/frontier checks establish durable transactions and optimistic concurrency. Competing requests re-inspect and re-evaluate their business predicate. An uncertain output acknowledgement also reopens and re-inspects; no prior transaction is blindly repeated.

Per-invoice ledgers avoid reconstructing current state from the existing CLI's eight-history-row inspection projection: every mutation replaces the same invoice key, so the latest current snapshot is present. Directory enumeration is discovery only, never a second finance authority. Decrypted snapshots are strictly validated before mutation and scoped to the authenticated buyer before return. The native host configuration must contain one stable service principal and writer; configuration and authorization never come from the browser.

Configure absolute paths:

| Variable | Required target |
| --- | --- |
| `WDBX_BINARY` | Installed executable implementing `wdbx typed inspect` and `wdbx typed commit` |
| `WDBX_COMMERCE_DIRECTORY` | Existing dedicated private directory, mode 0700 |
| `WDBX_COMMERCE_CONFIG` | Existing private schema-tagged host configuration JSON file, mode 0600 |
| `WDBX_COMMERCE_HOST_KEY` | Existing private 32-byte binary host HMAC key file, mode 0600 |
| `APP_ENCRYPTION_KEY` | Existing application AES key configuration; separate from native host HMAC key |

The host configuration schema is `wdbx-typed-host-config-v1`; namespace is a 32-byte array. `current` contains policy and consent 32-byte arrays, millisecond epoch validity bounds, and one grant with a 32-byte principal, `role: "service"`, and a 16-byte writer. `history` retains any prior epochs and the same stable grant. The native CLI validates configuration, private path inputs, epoch admission and WAL replay. Tests use a synthetic epoch and random temporary host key; these are not production authorization or configuration.

Existing SQL remains the durable Better Auth identity and rate-limit service. `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are required for those supporting services. This is WDBX-backed commerce, not a claim that every Quesar backend service has migrated to WDBX. GitHub Pages static mode cannot run these functions and must use contact sales.

Only `awaiting_payment → paid` and `awaiting_payment → cancelled` are supported. No client-supplied amount or product is accepted. No processor, card form, payment instructions, automatic charge, delivery entitlement or refund execution is implemented. Payment must be confirmed outside this app before an administrator records it.

Creation, administrator settlement and account deletion share a bounded cross-process admission lock per acting account made with atomic private-directory creation. Locks have no automatic stale takeover: a stopped writer requires operator review. A durable WDBX account tombstone fences later or in-flight creates and settlement attribution after deletion. Tombstones use separate direct-addressed WDBX account ledgers and do not consume the invoice discovery capacity. Global creation admission rejects invoice 1001 before its directory is created; existing 1000-invoice discovery and deletion remain available.

Account deletion clears current invoice buyer/idempotency association and audit actor links and replaces an associated settlement actor with `deleted-account`, preserving financial facts. Historic WDBX frames retain encrypted business records; this does not claim cryptographic erasure of finance history. Cleanup is a separate durable WDBX step before the existing SQL purge and provider revocation. A failure aborts account deletion; successful earlier ledger unlinks are idempotent on retry, but the cross-store operation is not one atomic transaction.

Capacity is explicit: the native typed store bounds each invoice ledger to 4096 versions and a 64 MiB journal. App snapshots are limited to the native 8192-byte KV value limit and four audit events. Discovery currently permits at most 1000 invoice directories. New creation is rejected at that limit before publication; an externally introduced excess returns an explicit capacity error rather than silently dropping invoices. This local native adapter requires persistent filesystem hosting and the WDBX executable; serverless ephemeral filesystems are not durable production storage. Typed WDBX host admission is partial substrate evidence and has no external rollback attestation. Deploying this adapter is not a production cutover claim.

Regression tests invoke the actual installed native executable against isolated private temporary stores. They cover competing creates and settlements, stable idempotency, user denial, administrator denial, encryption of WAL content, new process reads, simulated loss of native output after a real synced commit, unsafe directory rejection and account unlinks. The executable witness in this run is SHA256 `9df92b8e28f7a68427dee7e77ee781ef6e75299793ac289f157d74f17d1a652b`. Set `WDBX_TEST_BINARY` to a different qualified native binary when needed; missing binary is a failure, not a skipped native acceptance claim. Administrator decision tests remain in `admin.server.test.ts`; settlement tests mock that decision to exercise its mandatory invocation and refusal path. Persistent production host and browser acceptance still require independent verification.
