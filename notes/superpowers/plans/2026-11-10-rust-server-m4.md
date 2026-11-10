# Rust server M4: signed-in functions

Parent plan: `notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md` (milestone M4; see "Client contract", "Reused contracts, ported exactly" and the audit-expiry line under the crate table). M2 gave us sessions, the `AuthUser`/`SameOrigin` extractors, the `ApiError` envelope, `AuthServices` (`pool`, `limiter`, `clock`, `config`, `limit()`), `admin_decision_for` and `purge_and_delete`. M4 ports every function that needs a session except workspace connectors (M5) and commerce (M6): field notes, profile, billing, the console (consent, chat, sealed audits, admin reads), the desk and persona functions, the single LLM interface, and the daily audit-expiry job. The frontend does not change (M7 does that, against the API reference below), and the Node server stays a working parity oracle until M8.

## What M4 takes from M3

The M3 plan (`notes/superpowers/plans/2026-11-10-rust-server-m3.md`) appeared while this plan was being written; its code may not exist yet. M4 builds on these items of it, and Task 1 checks each against the code, creating only what is missing and saying so in its report:

- `quesar-contract` with `ServerFunction { NAME, Input, Output }`, `NoInput`, the ts-rs export to `src/lib/api/generated/` and the drift test (M3 Task 1). M4 adds one module per TypeScript file and registers each function in the export list.
- `quesar-server/src/api/`: `FnRouter` mounted at `/api/fn` with a mount-level `SameOrigin` layer, the cookie re-issue layer, POST-only routes, `api::body::read`/`read_value` (default cap `FN_BODY_MAX`), and the `ApiError` variants `InvalidBody`, `PayloadTooLarge` and `Internal` (M3 Task 2). Handlers live in `src/api/functions/`. The error envelope is `{ name, code, message }`.
- `api::PublicServices` on `AppState` and `router_with_public(config, auth, public)`, which lets a test replace a service before the router is built, plus the full-path request helper in `tests/common` (M3 Task 2). M4's services follow that pattern (Task 1).
- `quesar_services::text::{js_trim, utf16_len, utf16_prefix}` (M3 Task 3).
- The purge's `select id from "user" where id = $1 for update` and the first `for share` writer (M3 Task 5). M4 Task 3 turns the share read into one shared helper and adds the purge lock if M3 has not landed it.

## Global Constraints

- **The TypeScript file named in each task is the behavioural spec.** Port its behaviour, formats, constants, bucket names, result reasons and messages exactly. Where this plan and the TypeScript disagree on a value, the TypeScript wins; say so in the report. Where this plan deliberately departs (listed under "Decisions"), follow the plan and cite the item.
- Work only under `server/`, `scripts/`, `package.json`, `.gitignore` and the files a task names. Do not change `src/`, `app/`, `docs/` or existing `migrations/*.sql`. The one exception is Task 2's new file `src/lib/server/signed-in-contract.test.ts` and its two outputs under `server/contract/` (`architecture-catalog.json`, `signed-in-vectors.json`), plus the generated `src/lib/api/generated/*` that the M3 drift test rewrites. M4 needs no new migration.
- Rust: edition 2024, `unsafe` forbidden, `cargo fmt` clean, `cargo clippy --all-targets -- -D warnings` clean. No `unwrap`/`expect`/`panic!` outside tests and `main`'s startup path. Errors are typed enums implementing `std::error::Error`.
- Crates live in `server/crates/<name>/` and inherit `edition`, `rust-version`, `publish` and `[lints]` from the workspace.
- `sqlx` 0.8, runtime-checked queries only (`sqlx::query`, never the `query!` macros).
- Tests that need Postgres read `TEST_DATABASE_URL` and **fail** (naming `scripts/dev-postgres.sh`) when it is unset. They use `quesar_db::test_support::TestDatabase`.
- `bun run check:server` passes at the end of every task; `bun run test` stays green apart from the known `commerce.server.test.ts` failure. Commit `server/Cargo.lock` when dependencies change.
- Commit messages: conventional commits, ending with the two trailer lines the dispatch gives.

Additions for this milestone:

- Every function runs behind the mount-level `SameOrigin` layer, then `AuthUser`, then `Bucket::AuthGeneral` keyed by `auth.user.id`, before reading its body or doing any other work. Every query is scoped by `auth.user.id`; no handler reads a user id from the body, except the admin audit filter (Task 8), which is a filter and never an identity.
- **Lock order.** A transaction that writes a per-user row first runs `select 1 from "user" where id = $1 for share` (Task 3's helper) and stops if no row comes back. Nothing takes a user-row lock after touching a per-user table. No lock is held across an outbound HTTP call.
- Time is injected. SQL never calls `now()` for a value this milestone writes or compares: bind `services.clock.now()`. No sleeps in tests.
- No message content, model reply, prompt, sealed envelope, API key, gateway token or `Authorization` header in logs, errors or `Debug`. Keys live in `quesar_auth::ClientSecret`; the outbound `Authorization` header value is marked sensitive. A test that captures logs lives in its own test binary with `set_global_default`, as `quesar-server/tests/auth_*_logging.rs` do (M2 Task 11 found the scoped subscriber races parallel tests).
- Environment values are read through `Environment::read`, which trims and treats blank as unset, as `env()` does (`src/lib/env.server.ts`). There is no environment override for a model endpoint.
- Outbound HTTP is never real in tests. Model endpoints are fields of a config struct with production defaults; tests point them at an in-process mock (pattern: `quesar-auth/tests/support/mock_idp.rs`) and build clients with `.no_proxy()`. The model client follows no redirects.
- Sealing uses `quesar_services::crypto::SealingKeys` with the associated data of `console.server.ts:63-65`. Without a usable `APP_ENCRYPTION_KEY`, chat refuses and audits cannot be opened; plaintext is never stored.

## Decisions and where the code contradicts the brief

1. **`MAX_CHAT_BYTES` is in `console.server.ts:28`, not `body-limit.server.ts`.** The check measures `JSON.stringify(messages)` (`console.server.ts:213-220`), not the request body. Rust reads the body under a hard cap of twice that constant (413 above it), then measures the compact `serde_json` serialization of the `messages` value and returns the `too_large` result above `MAX_CHAT_BYTES`. The two serializers differ only for non-string numbers, which sanitizing drops anyway. The validator is `z.object({ messages: z.unknown() })` (`console.ts:52`), so a missing `messages` is not a validation error: Rust treats it as `null`, which sanitizes to nothing and returns the `invalid` result. A body that is not a JSON object is 400. A lone surrogate escape is 400 in Rust (M3 decision 14).
2. **"Rate limited before doing work" versus the TypeScript.** Only `runChat` is limited in the TypeScript (`llm`, `console.server.ts:244-247`), and it hits the bucket *after* validation, encryption, consent and provider checks, so a refusal does not burn quota (`ai-consent.test.ts:83`, "before provider or quota"). Resolution: `Bucket::AuthGeneral` keyed by user id (the bucket M2 uses for authenticated auth routes and M3 for configuration functions) runs first on every M4 route and answers 429; the `llm` bucket keeps the TypeScript's position and its in-band `rate_limited` result. This departs from `ai-consent.test.ts:93` and `:223-237`, which assert that a refused chat and a local desk answer leave no `rate_limits` row for the user: in Rust each leaves one `auth-general` row and no `llm` row. `AuthServices::limit` answers 429, so the in-band `llm` check calls `services.limiter.hit(Bucket::Llm, user_id, now_ms)` and reads `allowed`; a limiter error is the existing 503 mapping and the model is not called. M3's constraint "rate limited before resolving a session" is for anonymous callers keyed by IP; a per-user limit needs the user id, so here the session resolves first.
3. **Validation failures are HTTP 500 `ZodError` in the TypeScript.** Every M4 validator is a function calling `zod.parse`, and function validators run as is (`src/framework/server-fn.ts:185-196`), so the thrown error keeps zod's name and the dispatcher maps it to 500. The brief asks for `ValidationError`. Rust answers 400 `ValidationError` with a plain sentence (M3 decision 3). M7 checks any UI that printed a zod message.
4. **`deleteNote` takes a bare number** (`workspace.ts:43`, `notes-panel.tsx:109`). M3 decision 4 makes the body the input itself, so the body is the JSON number and the call site keeps its shape. M1's `LimitedJson` (objects only) is not used for function bodies.
5. **No dev user.** The TypeScript resolves `dev-user` when auth is off and no database is set (`verify.server.ts`). M2 ruled that out. With `VITE_AUTH_ENABLED=false` every M4 function answers 401 `UnauthorizedError` (the extractor finds no session); with no database, 503 `AuthUnavailableError` (M3 decision 12). All M4 functions are per-user, so none answers in either mode. Task 10 proves it per route.
6. **Billing sits in M3 in the parent plan's table** ("quasar and billing config"), but both functions run `authMiddleware` (`billing.ts:128,135`), so they are M4.
7. **The model interface has no response size cap** (`llm/index.ts:76,128` call `res.json()`). Rust caps the response body at 256 KiB and reports `provider_error` above it. Transport errors return a fixed message instead of the TypeScript's `error.message` (`llm/index.ts:159`); `runChat` discards that message anyway (`console.server.ts:259-265`).
8. **Catalog text.** The desk's catalog-only answer and the note validator both read `architectureNodes` (`systems.ts:50-67`, `workspace.ts:7`). Rust gets it from a committed JSON file generated from the TypeScript modules (Task 2), never from hand-copied content. The excerpt is cut in TypeScript (`slice(0, 280)` counts UTF-16 units), so Rust never re-cuts it. Server prompts (`SYSTEM_PREAMBLE`, the desk and persona prompts) and the plan catalog are code, not site content: they are Rust constants, pinned byte for byte by the vectors Task 2 generates beside it.
9. **`expireAudits` and `deleteAndLog` are single CTE statements because `Sql` has no transactions** (`console.server.ts:14-15`). Rust uses transactions so the user-row lock can come first; the delete and its event still commit together.
10. **Timestamps.** `listNotes` returns the driver's `created_at`; the console returns `iso()` strings. Rust returns `auth::view::iso` strings everywhere.
11. **String rules.** zod `.trim()` and `.max()` and `content.length` are JavaScript semantics: `String.prototype.trim` whitespace (includes U+FEFF, excludes U+0085) and UTF-16 code units. Every length and trim in this plan means `quesar_services::text::{utf16_len, js_trim}`. A client string bound as a `text` parameter (note body, admin reason, admin `userId` filter) that contains U+0000 is a `ValidationError`, not a database error. M3 ports the inquiry form's behaviour instead (its risk 12); the two differ on purpose.

## Task 1: foundations for signed-in functions

**Spec source:** `src/lib/server/crypto.server.ts:135-138` (`digest`); the M3 plan's Tasks 1-3 and 5 (the surface listed above).

- Check the M3 surface against the code; create what is missing.
- `quesar-services`: depend on `quesar-auth` (for `Clock`, `ClientSecret` and the admin decision; `quesar-auth` depends on neither `quesar-services` nor `quesar-server`, so there is no cycle). Add what later tasks need and nothing else: `serde`, `serde_json`, `time` and the sqlx `time` feature (the `timestamptz` columns), `uuid` (v4), `url`, `tracing`; `reqwest` arrives with M3 Task 4. Add `crypto::digest(&str) -> String` (unkeyed SHA-256, base64url without padding).
- `quesar-contract`: `Refusal<R> { ok: false, reason: R, message: String }`, built the way M3's `InquiryResult` gets its boolean `ok`, so a result union exports to TypeScript as `{ ok: true, ... } | { ok: false, reason: ..., message: string }`.
- `quesar-server`: `SignedInServices { sealing: SealingKeys, llm: Arc<dyn LlmClient>, catalog: Catalog, billing: BillingConfig }` on `AppState` (fields arrive in Tasks 2, 4 and 5; start with `sealing`, `SealingKeys::new` over `APP_ENCRYPTION_KEY` and `APP_ENCRYPTION_KEY_PREVIOUS`, the variables `readiness.rs:104-105` passes to `crypto::key_state`). It needs no database. `SignedInServices::build(&Config)` is the production constructor; a test replaces a field (the model client, the keys) before the router is built, through the constructor M3 added for `PublicServices` (extend it or add a sibling; do not add a second way). One helper `api::functions::admit(&AppState, &AuthUser) -> Result<&AuthServices, ApiError>` that runs the `auth-general` limit; every handler in Tasks 3-8 takes `AuthUser`, calls `admit`, then reads its body.

Tests: `digest("")` is `47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU` and `digest("abc")` is `ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0` (computed with `openssl dgst -sha256`; Task 2's `audit` vector adds a multi-byte case); a `Refusal` serializes with a literal `false` and exports the union above; a fixture function behind `admit` answers 429 with `Retry-After` on the hit after the bucket's maximum (injected clock) while a second user is unaffected, and a signed-out caller consumes no limiter row.

## Task 2: contract file generated from the TypeScript

**Spec source:** `src/lib/server/crypto-contract.test.ts` (the generator pattern and its `GEN_CONTRACT_VECTORS=1` gate), `src/lib/ai-consent.test.ts:1-37` (how to run the real handlers with a mocked `createServerFn`, `authMiddleware` and `@/lib/server/llm`), `src/lib/systems.ts`, `src/lib/ai.ts`, `src/lib/billing.ts`, `src/lib/console.server.ts`.

Add `src/lib/server/signed-in-contract.test.ts`. It writes two files, so the server binary embeds site content and no test material:

- `server/contract/architecture-catalog.json`: for each `architectureNodes` entry, `id`, `title`, `href`, `excerpt` and `searchText`, computed with the expressions of `systems.ts:53-62`.
- `server/contract/signed-in-vectors.json`: the sections below, read only by tests.

Without the flag it asserts both files equal what the code produces now, so `bun run test` fails when site content or a prompt changes; with the flag it rewrites them first. One exception: a sealed envelope carries a random nonce, so the `audit` envelope is checked by opening it with the real `open`, as `crypto-contract.test.ts` checks its vectors, never by equality. Vector sections:

- `deskLocal`: for several prompts (one matching, one matching nothing, one whose words are all two letters or shorter, one mixed case with punctuation, one containing U+212A KELVIN SIGN, which `toLowerCase` turns into `k`) and all five desks, the full result of `askDesk` with the model unconfigured.
- `modelRequests`: for each desk and each persona with the model mocked as configured, the exact argument passed to `complete` (messages and `maxTokens`).
- `billing`: `PLANS`; `readBillingConfig` for unset, blank, `not a url`, an `http:` link, an https link with a query and one without a path; `plansFor` for the three config states; and `checkoutFor` cases including an email needing escaping, a link that already carries `prefilled_email`, the `platform` plan, an unknown plan and `"constructor"`.
- `audit`: an obviously fake fixed key (as `crypto-contract.test.ts:23`), an id and owner, one `AuditContent` with a non-ASCII character, a quote and a newline, its `JSON.stringify` text, its `digest`, and the envelope sealed with `auditAad`.
- `telemetry`: `summarizeTelemetry` inputs and outputs, including the cases of `console.server.test.ts:366-383`.
- `constants`: `CHAT_AUDIT_POLICY_VERSION`, `AUDIT_RETENTION_DAYS`, `MAX_TURNS`, `MAX_CHAT_BYTES`, `MAX_MESSAGE_CHARS`, `REASON_MIN`, `REASON_MAX`, `INQUIRY_PAGE_SIZE`, `SYSTEM_PREAMBLE`.

Rust: `quesar_services::catalog::Catalog::embedded() -> Result<Catalog, CatalogError>` parses `include_str!` of the catalog file (`nodes()`, `contains_id(&str)`); it is called once on the startup path, where a parse error stops the server. Tests: it parses, is non-empty and ids are unique. Later tasks read the vectors file from their tests. Run `bunx prettier --write`, `bun run typecheck`, `bun run lint` on the new TypeScript file.

## Task 3: user-row locking, purge `for update`, field notes

**Spec source:** `src/lib/workspace.ts`, `migrations/0002_field_notes.sql`, `server/crates/quesar-auth/src/deletion.rs:309-351`, M2 ruling (progress.md line 75).

- `quesar_auth::user_lock::share(&mut PgConnection, user_id) -> Result<bool, AuthError>`: the `for share` read, lifted from M3's inquiry writer (which then calls it). `false` means the user is gone; handlers map that to `ApiError::Unauthorized`.
- `purge_and_delete`: confirm M3 made `select id from "user" where id = $1 for update` the first statement of the transaction; add it if not. A missing row keeps today's behaviour.
- `quesar_services::notes::{list, add, delete}`; `add` takes `&mut PgConnection` so a test can hold its transaction open. Handlers in `api/functions/workspace.rs`.
- `workspace.listNotes`: `workspace.ts:14-29` (own rows, newest first; add `id desc` as the tie-break, the TypeScript has none).
- `workspace.addNote`: `nodeId` must be a catalog id, else `ValidationError` "Choose an architecture node."; `body` is trimmed, empty is "Write a note.", longer than the cap of `workspace.ts:11` is a `ValidationError`. Transaction: `share`, insert, commit.
- `workspace.deleteNote` (`workspace.ts:42-50`): the body is a positive JSON integer, read as `i64` (a value above the `serial` range matches no row); deletes only where `user_id` matches; succeeds whether or not a row matched, as the TypeScript does.

Tests: a note is visible only to its author; deleting another user's note id changes nothing and still answers ok; unknown node, blank body, a body of 2001 units (2000 is stored), NUL in body, and ids `0`, `-1`, `1.5`, `"1"` and `null` are 400; a `userId` or `user_id` field in the `addNote` body is ignored; cross-site 403; signed out 401. Concurrency, both orders, without sleeps (wait by polling `pg_locks` for an ungranted lock under `tokio::time::timeout`, or use M3 Task 5's `nowait` probe, SQLSTATE 55P03):
- a transaction holding the user `for update` (the purge mid-flight) blocks `add`; after the user is deleted and committed, `add` reports the user gone and `field_notes` has no row for that id;
- an open `add` transaction blocks `purge_and_delete`; after commit the purge removes the new note too.
Re-run the M2 deletion tests unchanged.

## Task 4: profile and billing

**Spec source:** `src/lib/profile.ts:59-83`, `src/lib/billing.ts`, `src/lib/billing.test.ts`.

- `profile.getProfile`: explicit columns only (`profile.ts:64-75`); the user fields come from `auth.user`, which the extractor read in this request; `providers` are the distinct `"providerId"` values of the caller's `account` rows. Add `order by "createdAt", id` for a stable order (the TypeScript has none). Never selects token or password columns.
- `quesar_services::billing`: `BillingConfig::from_lookup` (`billing.ts:63-75`: provider default, unset, unparseable, non-https), `plans_for` (`:82-87`), `checkout_for` (`:93-125`, including the order of checks: unknown plan, then a plan without self-serve checkout, then configuration). The query edit follows `URLSearchParams.set`; Task 2's `billing` vectors decide the exact string.
- `billing.getBillingPlans`, `billing.createCheckout { planId }` (`planId` at most 64 units, `billing.ts:136`). The email comes from `auth.user.email` (the TypeScript reads the same row, `billing.ts:142-148`), never the body. An unknown plan is the `Unknown plan` result, not a 400. No Stripe API call is made, and the configured link is never logged.

Tests: every `billing` vector; a credential user and a Google-linked user get the right `providers` and no other field; `createCheckout` ignores a client-sent `email` and `userId`; the link is not mutated between calls (`billing.test.ts:100`).

## Task 5: the model interface

**Spec source:** `src/lib/server/llm/index.ts`, `src/lib/server/config.server.ts:20-60`, `src/lib/server/llm/index.test.ts`.

`quesar_services::llm`:
- `LlmConfig::from_lookup`: provider selection exactly as `config.server.ts:53-60` (a pinned provider that is not configured gives none; an unrecognized pin falls through to auto-selection). Gateway validation exactly as `config.server.ts:21-39`; for selection a malformed URL counts as not configured (`:41-47`).
- `trait LlmClient { fn status(&self) -> LlmStatus; fn complete<'a>(&'a self, CompleteRequest) -> BoxFuture<'a, CompleteResult> }` (boxed future, as `deletion.rs` does). `HttpLlm` is the production implementation; `LlmEndpoints { xai: String }` defaults to the URL of `llm/index.ts:58`, and the gateway URL is the validated one, so both production endpoints are https. `HttpLlm::new(config, endpoints, timeout)` is what tests call to aim at the mock; `from_lookup` cannot produce a non-https or non-Cloudflare endpoint.
- Request bodies, defaults and headers: xAI `llm/index.ts:58-68`; Gemini `:95-119` (system messages joined and sent first; the five `cf-aig-*` headers verbatim). Models: `:29-30`. Timeout: `:61,112`.
- Results: non-2xx is `provider_error` with the message forms of `:74,125`; a reply whose first choice has no non-empty string content is `provider_error` "The model returned no text." (`:47-52`, trimmed); no provider is `not_configured` with the message of `:153`. A request with no user message is a programming error: return a typed `Err`, never call out.
- Added: 256 KiB response cap, no redirects, fixed transport-error message.

Tests (in-process mock server recording requests): the six cases of `index.test.ts`; exact request JSON and headers for both providers; system messages merged for Gemini; 500, empty choices, a first choice whose content is whitespace or not a string, non-JSON, a 300 KiB body, a redirect to a second mock that would answer (never called) and a hung connection (a short constructor timeout; no sleep in the test) all give `provider_error` and no text; a pin to an unconfigured provider is `not_configured` and calls nothing; a log capture during a failure shows neither key nor token nor prompt nor the response body; `Debug` of the config and of the client prints `[redacted]`.

## Task 6: consent, console status and the audit store

**Spec source:** `src/lib/console.server.ts:42-71,95-180,285-511`, `src/lib/console.ts:29-73`, `migrations/0005_console_audits.sql`, `src/lib/console.server.test.ts:184-270`.

`quesar_services::console::{consent, audits}`; handlers in `api/functions/console.rs`.

- Consent: `get` (`:124-137`), `accept` (`:139-153`: a version other than the current one is the `stale_policy` result, one over 64 units is a `ValidationError`, `console.ts:38`; the upsert runs after `share`), `withdraw` (`:155-161`, an update, no lock needed).
- `console.getConsoleStatus`: `:172-180`, with `encryption` from `sealing.configured()`.
- `audits::record(&mut PgConnection, &SealingKeys, user_id, &AuditContent, provider, model, now)`: `share`; id from `uuid` v4, lowercase hyphenated; plaintext is the compact JSON of `{messages, reply}` in that field order, serialized once for both seal and digest (`:287-289`); `expires_at = now + 365 days`.
- `access_event`: `:101-113`, each insert after `share` on the actor.
- `list_own` (`:392-424`): events `requested` then `succeeded`; select summary columns only, never `sealed`; unexpired, newest first, limit as `:405`. When the query fails, write the `failed` event best effort and answer `Internal` (`:414-422`); the same holds for `delete_and_log` (`:481-495`).
- `read` (`:346-390`), shared with Task 8: `requested`, then `failed` for a missing or expired row, for missing encryption and for an envelope that does not open or parse, else `succeeded`. Opens with the row's owner id as associated data (`:374-375`). A user read is scoped to the caller; `download: true` logs `export`.
- `delete_and_log` (`:441-496`): `requested`; then one transaction: `share` on the actor, delete the unexpired row (owner-scoped for users), insert the `succeeded` event; no row gives a `failed` event and `not_found`.
- Ids that fail the pattern of `:42` are the `invalid` result and write no event (`:431,502`). Check the pattern by hand, case-insensitively, and bind the id as text exactly as sent: never parse it into a `Uuid` and print it back, which would make an upper-case id match a stored lower-case one. An id over 64 units is a `ValidationError` (`console.ts:29`).

Tests: Task 2's `audit` vector opens in Rust and its digest matches; a Rust-sealed row has no plaintext substring in `sealed`; a row moved to another owner is `undecryptable` for the thief (`console.server.test.ts:220`); another user's read and delete are `not_found` and the exact event rows are asserted; expired rows are invisible to list, read and delete; without a key, read is `encryption_not_configured` and status says `encryption: false`; stale policy; withdraw then status; a client-sent `userId` in any body is ignored; `record` with unconfigured keys is an error and writes no row; the consent upsert, `record` and `access_event` each pass the Task 3 concurrency pair.

## Task 7: chat, persona and desk

**Spec source:** `src/lib/console.server.ts:23-40,73-93,182-283`, `src/lib/console.ts:49-55`, `src/lib/ai.ts:6-28`, `src/lib/systems.ts`, `src/lib/ai-consent.test.ts`, `src/lib/console.server.test.ts:99-183`.

`console::chat::run_chat(services, user_id, messages: &serde_json::Value, options: Option<ServerPrompt>) -> ChatResult`, in this order (`:201-206`):
1. Size per Decision 1 (`too_large`; a missing `messages` counts as `null`); `sanitize` per `:78-93` (non-arrays and malformed entries filter to nothing, client `system` turns are dropped, content is non-blank and within `MAX_MESSAGE_CHARS`, last `MAX_TURNS` kept); no user turn left is `invalid`.
2. No sealing key: `encryption_not_configured`.
3. No current, unwithdrawn consent: `consent_required`.
4. Model not configured: `llm_not_configured`.
5. `llm` bucket by user id through `limiter.hit` (Decision 2): the `rate_limited` result (HTTP 200).
6. `complete` with the system message of `:249-258`. `ServerPrompt` is built only by server code; no request type has a system-prompt or token field.
7. Failure: `not_configured` maps to `llm_not_configured` with the provider's message; anything else is `provider_error` with the fixed message of `:262-265`. **Nothing is stored**; the `llm` hit stays counted.
8. `audits::record` in its own short transaction, after the model call. Any failure (user gone, seal, insert) is `audit_failed`: the reply is withheld, one fixed log line, no content.
9. Only then return the reply with the audit's id and timestamps.

Functions:
- `console.sendChat { messages }`.
- `ai.askPersona { prompt, persona? }`: prompt trimmed, 1 to the cap of `ai.ts:7`; persona defaults per `ai.ts:8`; prompts and token cap `ai.ts:11-27`.
- `systems.askDesk { desk, prompt }`: validation `systems.ts:16-19`. `quesar_services::desk` ports `tokens` (`str::to_lowercase`, the full Unicode mapping `toLowerCase` uses, never the ASCII one), `overlap`, `catalog_hits` (stable sort, top 4) and `local_reply` (`:34-81`) over Task 2's catalog. Unconfigured model: the local result, with no key, consent or `llm` hit needed. Configured: `run_chat` with the composed message of `:99-103`; a refusal is returned as is (`:105`), success adds `mode`, `desk`, `hits`.

Tests: every `deskLocal` and `modelRequests` vector (a scripted `LlmClient` captures the request); the `sanitizeMessages` cases; each refusal in order, asserting the scripted client was not called and no `llm` row exists for refusals 1-4; the chat after the `llm` bucket's maximum (`rate-limit.server.ts:17`) is `rate_limited` and calls nothing; a provider failure stores no audit; a failing insert (trigger, as `ai-consent.test.ts:190-222`) gives `audit_failed` with the reply and the driver text absent from the response and from captured logs (the TypeScript's other case, a key invalidated after admission, `ai-consent.test.ts:165-178`, cannot happen with keys read once at startup; Task 6's `record` test covers the seal error instead); body fields `systemPrompt` and `maxTokens` are ignored (`ai-consent.test.ts:238-254`); a 300 KiB body is 413 `PayloadTooLargeError` and a 140 KiB `messages` value is the `too_large` result; `{}` and `{"messages":"x"}` are the `invalid` result and `[]` is 400; a 1601-unit persona prompt and a 1201-unit desk prompt are 400 and an unknown persona or desk is 400; two users each get their own `llm` window; the sealed record holds the sanitized turns and reply, not the system prompt; a user purged during the model call gets `audit_failed` and leaves no row.

## Task 8: admin functions

**Spec source:** `src/lib/console.server.ts:513-697`, `src/lib/console.ts:75-115`, `src/lib/console.server.test.ts:273-383`, `quesar_auth::admin`.

Every admin function calls `admin_decision_for(&pool, &auth.user.id, &config.admin_emails)` on every request, right after `admit` and before it reads the body, with no caching. A non-admin gets the `forbidden` result whatever the body holds, and **no access event is written**. An error from the decision is a 5xx, never admin.

- `console.getAdminStatus`: the collapse of `:520-529` (only `no_allowlist` is distinguished).
- `console.adminAudits { reason, userId? }`: order admin, reason (`validReason`, `:68-71`; failure is the `invalid` result with the message of `:536-539`), then events and the query of `:549-571`. `userId` is at most 200 units (`console.ts:82`), trimmed, and blank means no filter (`:548`). Summary columns only.
- `console.adminReadAuditFn`, `console.adminDeleteAuditFn { id, reason }`: order admin, reason, id (`:590-593`), then Task 6's `read` and `delete_and_log` with `actor_type = admin` and the trimmed reason on every event.
- `console.adminTelemetry`: `:638-646`; the summary must reproduce Task 2's `telemetry` vectors. `events` is serialized in the query's row order (count descending, then name): the admin page lists `Object.entries(summary.events)` (`telemetry-summary.tsx:36`), so a `HashMap` or `BTreeMap` would reorder what the admin sees. Use an ordered pair list with a map serializer and a hand-written `Record<string, number>` TypeScript declaration.
- `console.adminInquiries { page }`: page bounds `console.ts:111`; one extra row decides `hasMore` (`:679-696`).

Tests: an allowlisted email/password user and a non-allowlisted Google user are `forbidden` on all five data functions, with a valid body and with an invalid one, and the event table is unchanged; `getAdminStatus` says `not_admin` for both and `no_allowlist` when `ADMIN_EMAILS` is empty; telemetry `events` keep the query order; revoking the verification row between two calls turns the second into `forbidden`; reasons `""`, `"short"` and 201 units are `invalid`, a 401-unit reason is a 400; an admin read opens another user's audit and logs `admin` with the reason; admin delete; the filter narrows and a blank filter does not; inquiries page 1 and 2 newest first with `hasMore`; with auth disabled every function is 401.

## Task 9: daily audit expiry in process

**Spec source:** `src/lib/console.server.ts:716-727`, `src/routes/api/cron/audits-expire.ts`, `server/crates/quesar-db/src/migrate.rs:81-106` (detached connection and session advisory lock).

- `console::expiry::expire_once(pool, now) -> Result<ExpiryOutcome, _>`: acquire and **detach** a connection; `pg_try_advisory_lock` with a new two-integer key defined beside, and different from, `migrate.rs`'s `LOCK_KEY`; not obtained means `Skipped`. Then one transaction on that connection: lock the owners first (`select id from "user" where id in (select user_id from conversation_audits where expires_at <= $now) order by id for share`), delete the expired rows, insert one `system`/`expire`/`succeeded` event per row whose owner exists, with the owner as `actor_user_id` and the reason text of `:724`. Expired rows without a user row are deleted with no event and counted in the log. Unlock, close the connection.
- `quesar-server`: when a database is configured, spawn one task that runs `expire_once` at startup and every 24 hours on `tokio::time::interval`, logs the count, logs and survives errors, and is aborted on graceful shutdown. Write the loop over a sweep closure so a test can drive it. It runs with sign-in switched off too.
- Retired: no `/api/cron/*` route (JSON 404), no `CRON_SECRET` read. `Bucket::AuditExpiry` stays in the table for parity with the TypeScript contract tests.

Tests: expired rows go and unexpired stay, one event each (`console.server.test.ts:410`); a second connection holding the advisory lock makes `expire_once` return `Skipped` and delete nothing; dropping the future mid-run releases the lock (the server frees it when it notices the closed session, so the test polls `pg_locks` until the advisory lock is gone, under a timeout, and then a following run succeeds); with paused tokio time the loop sweeps once at start, again after 24 hours, and again after a sweep that returned an error; an orphan expired row is deleted without an event; a purge holding the owner `for update` blocks the run and neither deadlocks; `GET` and `POST /api/cron/audits-expire` are 404.

## Task 10: route table, smoke and records

- A test that walks the API reference: each route answers POST only; signed out 401; cross-site 403; with `VITE_AUTH_ENABLED=false` 401; with no database 503; none of them is 404.
- The generated TypeScript in `src/lib/api/generated/` is current (the drift test) and its `ServerFunctions` interface lists every name below.
- `scripts/smoke.sh`, in its database section (`smoke.sh:100-143`; the first section runs without a database, where these routes are 503): with `Origin: ${ORIGIN}` a signed-out `POST /api/fn/console.sendChat` is 401; with a foreign `Origin` it is 403; `/api/cron/audits-expire` is 404.
- Append an M4 entry to the parent plan's progress log, and list for M7 the call-site changes from Decisions 3 and 10.

## API reference

All routes are `POST /api/fn/<name>`, same-origin, session required, bucket `auth-general` by user id; the JSON body is the input itself, and a function without input ignores the body. Success is `{ ok: true, result }` with HTTP 200; a business refusal is a result of the form `{ ok: false, reason, message }`, also HTTP 200 (billing keeps its own `{ ok: false, error, nextStep? }`). The five `console.admin*` routes also need the admin decision on every call; a non-admin gets the result refusal `forbidden`, not an HTTP error.

Envelope errors, every route (`{ ok: false, error: { name, code, message } }`): 401 `UnauthorizedError` (signed out, or sign-in switched off); 403 `CrossSiteRequestError`; 400 `ValidationError` (malformed JSON, a wrong type, a missing required field, or a limit below); 405 `MethodNotAllowedError`; 413 `PayloadTooLargeError`; 429 `RateLimitedError` with `Retry-After`; 503 `AuthUnavailableError` (no database, or the store failed); 500 `InternalError`.

Limits that give 400, in UTF-16 units after trimming where the TypeScript trims: `addNote.body` 1-2000 and `nodeId` a catalog id; `deleteNote` a positive integer; `planId` 64; `policyVersion` 64; audit `id` 64; `reason` 400 (8-200 is checked in-band as `invalid`); admin `userId` 200; `page` an integer 1-10000; persona `prompt` 1-1600; desk `prompt` 1-1200; unknown `persona` or `desk`.

| Name | Request | Result |
| --- | --- | --- |
| `workspace.listNotes` | none | `{ id, node_id, body, created_at }[]` |
| `workspace.addNote` | `{ nodeId, body }` | `null` |
| `workspace.deleteNote` | a positive integer | `null` |
| `profile.getProfile` | none | `{ name, email, image, emailVerified, providers } \| null` (never null in Rust) |
| `billing.getBillingPlans` | none | `{ configured: true, provider, plans: { id, name, price, description }[] }` or `{ configured: false, provider, reason: "unconfigured" \| "misconfigured" }` |
| `billing.createCheckout` | `{ planId }` | `{ ok: true, url }` or `{ ok: false, error, nextStep? }` |
| `console.getConsoleStatus` | none | `{ llm: { configured, provider, model }, encryption, consent: ChatConsent, policy: { version, retentionDays } }` |
| `console.acceptConsent` | `{ policyVersion }` | `{ ok: true, consent: ChatConsent }`; refusal `stale_policy` |
| `console.withdrawConsent` | none | `ChatConsent` = `{ policyVersion, accepted, consentedAt, withdrawnAt }` |
| `console.sendChat` | `{ messages: { role: "user" \| "assistant", content }[] }` | `ChatResult` = `{ ok: true, text, provider, model, audit: { id, createdAt, expiresAt } }`; refusals `invalid`, `too_large`, `encryption_not_configured`, `consent_required`, `llm_not_configured`, `rate_limited`, `provider_error`, `audit_failed` |
| `console.listMyAudits` | none | `AuditSummary[]` = `{ id, userId, provider, model, policyVersion, createdAt, expiresAt }` |
| `console.readMyAudit` | `{ id, download? }` | `{ ok: true, audit: AuditSummary & { contentDigest, content: { messages, reply } } }`; refusals `invalid`, `not_found`, `encryption_not_configured`, `undecryptable` |
| `console.deleteMyAudit` | `{ id }` | `{ ok: true }`; refusals `invalid`, `not_found` |
| `console.getAdminStatus` | none | `{ admin: true }` or `{ admin: false, reason: "no_allowlist" \| "not_admin" }` |
| `console.adminAudits` | `{ reason, userId? }` | `{ ok: true, audits: AuditSummary[] }`; refusals `forbidden`, `invalid` |
| `console.adminReadAuditFn` | `{ id, reason }` | as `readMyAudit` (without `download`), plus refusal `forbidden` |
| `console.adminDeleteAuditFn` | `{ id, reason }` | `{ ok: true }`; refusals `forbidden`, `invalid`, `not_found` |
| `console.adminTelemetry` | none | `{ ok: true, summary: { events: Record<string, number>, conversion: { opens, successes, rate: number \| null } } }`, `events` in count-descending order; refusal `forbidden` |
| `console.adminInquiries` | `{ page }` | `{ ok: true, inquiries: { id, userId: string \| null, name, email, company, projectType, message, createdAt }[], page, hasMore }`; refusal `forbidden` |
| `ai.askPersona` | `{ prompt, persona?: "abbey" \| "aviva" \| "abi" }` | `ChatResult` |
| `systems.askDesk` | `{ desk: "abbey" \| "aviva" \| "abi" \| "quesar" \| "wdbx", prompt }` | `{ ok: true, mode: "local", desk, text, hits }`, or `ChatResult` success plus `{ mode: "model", desk, hits }`, or a `ChatResult` refusal; `hits` = `{ id, title, href, excerpt, score }[]` |

Timestamps are ISO 8601 UTC with milliseconds. `console.sendChat` alone accepts a body up to twice `MAX_CHAT_BYTES`; the other routes use the default function body cap.

## Risks and open questions

1. **M3 may land differently from its plan.** Default: Task 1 adapts to the code and creates only what is missing; names in this plan (`admit`, `SignedInServices`) yield to M3's.
2. **`for share` on every writer adds a lock per write.** Default: accept; the lock is held for one short transaction and never across the model call. If the concurrency tests show a deadlock, the cause is a lock-order violation; fix the order, do not remove the lock. `for share` also waits behind any `update "user"` (a rename), where `for key share` would conflict only with the purge's `for update` and the delete. Default: `for share`, as M2 ruled; the owner may relax it to `for key share` in the one helper.
3. **`rate_limits` rows are keyed by user id and have no user lock.** A request racing a purge can leave one counter row. Default: accept; it holds no content and is pruned within 24 hours.
4. **An admin's access event can outlive the purged owner of that audit** (a delete event always, a read event when it races the purge: the admin's writer locks the admin's row, not the owner's). The row carries the admin's id, the admin's reason and a random audit id, nothing of the owner's. Default: accept, as the TypeScript does.
5. **Model names and endpoints are constants** (`llm/index.ts:29-30,58`). Default: port as they are; changing a model is a code change in both servers until M8.
6. **`toFixed(4)` rounding** in the telemetry rate may differ from a naive float round at exact ties. Default: Task 2's vectors decide; add a case if a difference is found.
7. **The general limit shares `auth-general` with the auth routes** and has no TypeScript source. Default: keep it; a signed-in page makes a handful of calls per load, far below the bucket. Give functions their own bucket only if a real page is seen to hit it.
8. **Expiry events for orphan audits are dropped** (Task 9), where the TypeScript would log one. Default: accept; no such rows can be created once every writer takes the user lock.
9. **Gateway URL validation uses the `url` crate, the TypeScript uses WHATWG `URL`.** Default: test the accepted and refused forms of `config.server.ts:27-33` (other host, `http`, extra path segment, query, fragment); a difference found there is reported, not guessed at.
10. **The contract test adds one file under `src/`.** It follows the M1 and M2 vector pattern and changes no existing file. Default: allowed; anything further under `src/` is out of scope and reported as NEEDS_CONTEXT.
11. **Field notes have no per-user cap and `listNotes` no limit**, as in the TypeScript; `auth-general` bounds the write rate only. Default: port as is and report it; a cap is the owner's call.
12. **`events` order in the telemetry summary** depends on a JSON object keeping insertion order, which the browser honours for these keys. Default: keep the TypeScript shape (Task 8); M7 may change the page to sort for itself.
