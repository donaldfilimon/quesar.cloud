# Rust server M3: public functions

Parent plan: `notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md` (milestone M3; see "Client contract", "Reused contracts", "Crate layout"). M0-M2 exist: `quesar-db`, `quesar-services` (`crypto`, `rate_limit`), `quesar-auth`, and in `quesar-server` the `/api/auth/*` router with `ApiError`, `AuthServices`, the `SameOrigin`/`FetchMetadata`/`AuthUser`/`MaybeUser`/`ClientIp` extractors, the re-issue layer and `body_limit`. M3 is the first milestone to add `/api/fn/*`. It creates the `quesar-contract` crate, the function router and the generic pieces M4-M6 reuse, then ports everything that needs no session: contact inquiries with Turnstile, telemetry, CSP reports and three configuration reads. The frontend does not change (M7 points it at the API reference below); the Node server stays the parity oracle until M8.

## Global Constraints

- **The TypeScript file named in each task is the behavioural spec.** Port its behaviour, formats, constants, bucket names and error cases exactly. Where this plan and the TypeScript disagree on a value, the TypeScript wins; say so in the report. Where this plan *deliberately* departs from the TypeScript (listed in "Decisions and where the code contradicts the brief"), follow the plan and cite the item.
- Work only under `server/`, `scripts/`, `package.json`, `.gitignore`, and the files a task names. Do not change `app/`, `docs/`, existing `migrations/*.sql`, or any existing file under `src/`. The only additions under `src/` are the generated `src/lib/api/generated/*` (Task 1) and one contract-vector test, `src/lib/server/public-contract.test.ts` (Tasks 3, 5, 6), which follows `src/lib/server/rate-limit-contract.test.ts`. M3 adds no migration.
- Rust: edition 2024, `unsafe` forbidden, `cargo fmt` clean, `cargo clippy --all-targets -- -D warnings` clean. No `unwrap`/`expect`/`panic!` outside tests and `main`'s startup path. Errors are typed enums implementing `std::error::Error`.
- Crates live in `server/crates/<name>/` and inherit `edition`, `rust-version`, `publish` and `[lints]` from the workspace.
- Database access is `sqlx` 0.8, runtime-checked queries only (`sqlx::query`, never `query!`).
- Secrets never appear in logs, error messages or `Debug` output. In M3 that is `TURNSTILE_SECRET` and Turnstile tokens (redacting newtypes, as M2's), and inquiry content: no name, email or message text is ever logged, and no database driver text reaches a log line (`inquiry-logging.server.test.ts` is the rule).
- Tests that need Postgres read `TEST_DATABASE_URL` through `quesar_db::test_support::TestDatabase` and **fail** without it; tests that need no database must not require one. No sleeps: the clock is `AuthServices.clock` (a `FixedClock` in tests).
- Outbound HTTP is never real in tests. The Turnstile siteverify URL is a field of its config struct with the production URL as default and no environment override; tests point it at an in-process mock (pattern: `server/crates/quesar-server/tests/oauth_support`). Clients follow no redirects, time out after 10 s, cap the response at 64 KiB, and test clients call `.no_proxy()`.
- Every function and endpoint is rate limited before it reads a body, resolves a session or calls out, with the TypeScript's bucket (`Bucket::Inquiry`, `Bucket::Telemetry`, `Bucket::CspReport` already exist in `quesar_services::rate_limit`).
- String lengths the TypeScript measures with `.length` are UTF-16 code units, and `.trim()` and regex `\s` use the ECMAScript whitespace set (it includes U+FEFF and excludes U+0085, unlike `str::trim`). Task 3 adds the two helpers; use them wherever a task ports a length or a trim.
- `bun run check:server` must pass at the end of every task, from the repo root; commit `server/Cargo.lock` when a dependency is added. A task that touches `src/` or `package.json` also runs `bun run typecheck`, `bun run lint`, `bun run format:check` and `bun run test` (one known unrelated failure: `commerce.server.test.ts`).
- One writer at a time. Commit messages are conventional commits ending with the two trailer lines from the dispatch.

## Decisions and where the code contradicts the brief

1. **The dispatcher refuses cross-site calls in plain text.** `app/api/server-fn/[id]/route.server.ts:28` answers `new Response("Forbidden", { status: 403 })`, which the client turns into a nameless `Error` (`server-fn.client.ts:32-36`). Rust answers the envelope: 403 `CrossSiteRequestError`. The brief asks both for an exact port and for enveloped rejections; the envelope wins because it is what M7's client parses.
2. **Dispatcher-internal error names.** The dispatcher uses `NotFound` ("Unknown server function.", 404) and `BadRequest` ("Malformed request.", 400) (`route.server.ts:37-46`). Nothing under `src/` matches on either (grep for `"NotFound"`, `"BadRequest"`: only the dispatcher). Rust keeps M2's names so one API has one vocabulary: `NotFoundError` with code `UNKNOWN_FUNCTION` and the dispatcher's message, and `ValidationError` with code `INVALID_BODY` and the dispatcher's message. `UnauthorizedError`, `CrossSiteRequestError` and `ValidationError` keep their TypeScript names and messages.
3. **Validation failures are 400, not 500.** `toValidator` throws an `Error` named `ValidationError` with no `status` (`server-fn.ts:188-194`), so the dispatcher's mapping (`route.server.ts:53-64`) sends it as 500. Rust sends 400. Likewise an unexpected failure is 500 `InternalError` "Server function failed." and never the underlying message, which the TypeScript leaks (`route.server.ts:54`).
4. **Wire body.** The TypeScript posts seroval `{ data: … }` (`server-fn.client.ts:26`, `wire.ts`). Rust takes the input itself as the JSON body, per the parent plan. A function without input ignores the body.
5. **All server functions are POST.** `createServerFn({ method: "GET" })` is declarative only; the client always POSTs and the dispatcher exports only `POST`. Every `/api/fn/*` route is POST-only and same-origin, including the reads. Other methods get 405 `MethodNotAllowedError` with `Allow: POST`.
6. **`inquiries` is a table without a foreign key to `"user"`** (`migrations/0003_inquiries.sql:5`), and `sendInquiry` writes `user_id` for a signed-in sender. The brief's list of such tables omits it, but M2 Task 11's ruling applies in full: M3 is therefore the first milestone that adds a per-user writer, so Task 5 adds the `for update` to the purge and the `for share` to the writer.
7. **`getCommerceReadiness` is ported here** (the parent plan's M3 row says "billing config"; it is environment-only and unauthenticated, `commerce.ts:40-43`), with two departures. It does not require `BETTER_AUTH_SECRET` (`commerce.server.ts:240`): the Rust auth has no such secret and the name is retired at M8. And `configured` is forced `false` until M6 ships the invoice functions, through one constant M6 flips: the Rust server must not say invoicing is ready while it cannot create an invoice.
8. **Sign-in methods are not duplicated.** `getSignInMethods` (`src/lib/auth/methods.ts`) already exists as `GET /api/auth/methods`; M7 calls that route. `loadGithub` (`src/lib/github.ts`) is not ported: the browser-direct path plus the build-time snapshot already works.
9. **Telemetry and CSP reports are not server functions.** The browser posts to `/api/telemetry` with `sendBeacon` (`src/lib/telemetry.ts:37`) and the CSP header names `/api/csp-report`. Both keep their paths, their bare `{ "error": … }` bodies and their statuses; neither uses the envelope or a same-origin check (the TypeScript has none, and CSP reports arrive without credentials).
10. **Turnstile `remoteip`.** `requesterIp` (`turnstile.server.ts:50-58`) trusts `x-real-ip` and `x-forwarded-for` unconditionally. M1 ruled that Rust trusts only the header `TRUSTED_PROXY` names. Rust sends `ClientIp` as `remoteip` unless it is a loopback or unspecified address (the proxy's own, when no header is trusted), in which case the field is omitted; siteverify treats it as optional.
11. **Without a database** the TypeScript falls back to PGLite; Rust has none. Configuration functions still answer. `sendInquiry` returns its own `unavailable` result, and the two sinks answer 204, which is each handler's existing "limiter unavailable" branch (`inquiries.server.ts:33-40`, `telemetry.server.ts:48-54`, `csp-report.server.ts:30-36`).
12. **With `VITE_AUTH_ENABLED=false`** `/api/fn` is outside the `/api/auth` default-deny guard. Public functions answer; a session never resolves (`extract.rs` `lookup` returns none), so `sendInquiry` stores a null `user_id` (as `getSessionUser` does, `verify.server.ts:50`) and every per-user function added by M4-M6 answers 401.
13. **Same-origin is judged against the configured origins, not the request URL.** `isSameOriginRequest` compares `Origin` and `Referer` with `new URL(request.url).origin` (`csrf.ts:17-22`). M2 Task 4 already ported it as `extract::is_same_origin`, which never reads `Host` and compares with `AuthConfig.trusted_origins` (the public origin, plus the three local development origins outside production). `/api/fn` uses that function unchanged. `Sec-Fetch-Site: same-origin` alone still passes, as in the TypeScript.
14. **JSON the TypeScript accepts and Rust refuses.** `serde_json` rejects a lone surrogate escape (`"\ud800"`) that `JSON.parse` accepts. Such a body is 400 `INVALID_BODY` on a function and 400 on telemetry. No real client sends one.

## Task 1: `quesar-contract` crate, ts-rs export and drift test

**Spec source:** parent plan "Client contract"; `src/framework/wire.ts` (`WireReply`, `WireError`); `src/lib/inquiry-rules.ts:24-33,104-111` (`InquiryInput`, `InquiryField`, `InquiryResult`); `src/lib/inquiries.ts:41-42` (`TurnstileConfig`); `src/lib/quasar/config.ts:10-11`; `src/lib/server/commerce.server.ts:236-248`.

Create `server/crates/quesar-contract` (deps: `serde`, `serde_json`, `ts-rs`; no database, no HTTP). Pin the newest `ts-rs` that builds on the workspace `rust-version` and record the version in the report.

- `src/lib.rs`: `pub trait ServerFunction { const NAME: &'static str; type Input: DeserializeOwned + TS; type Output: Serialize + TS; }`; `ErrorBody { name, code, message }`; `NoInput` (serialises as `null` on the TypeScript side: the call takes no argument).
- `src/inquiries.rs`, `src/quasar.rs`, `src/commerce.rs`: the request and result types of the four functions in the API reference, with serde attributes that reproduce the TypeScript JSON exactly (`turnstileToken`, `siteKey`, `paymentMode` in camelCase; `InquiryResult` as the two-shape union keyed by the boolean `ok`; `TurnstileConfig` tagged by `state`; `field` omitted when absent, never `null`). One unit struct per function implements `ServerFunction`.
- `src/export.rs`: `pub fn files() -> Vec<(String, String)>`, one TypeScript file per exported type plus `index.ts`, which declares `export interface ServerFunctions { "inquiries.sendInquiry": { input: SendInquiryInput; result: InquiryResult }; … }` built from a `FUNCTIONS` list. M7's `serverFn` is typed from that interface.
- `tests/drift.rs`: compares `files()` with `src/lib/api/generated/` byte for byte, fails on a missing, extra or different file, and names the regenerate command: `GEN_CONTRACT_TYPES=1 cargo test -p quesar-contract --test drift`, which rewrites the directory.
- Commit `src/lib/api/generated/`. Add that directory to `.prettierignore` and to the `ignores` list in the ESLint config (both files are named exceptions); it must still pass `bun run typecheck`.

Tests:
- JSON round trips for each type against literals copied from the TypeScript shapes: `{"ok":true}`; `{"ok":false,"code":"invalid","error":"…","field":"email"}`; `{"state":"ready","siteKey":"k"}`; `{"state":"off"}` with no `siteKey` key; `null` and a string for the Quasar origin.
- Every `NAME` matches `^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$` and names are unique.
- The drift test fails when a generated file is edited by hand (prove it once, by hand, and say so in the report).

## Task 2: the function router and shared request plumbing

**Spec source:** `app/api/server-fn/[id]/route.server.ts` (whole file); `src/framework/csrf.ts`; `src/framework/server-fn.ts:150-169` (middleware, then validator, then handler); `server/crates/quesar-server/src/auth/{error,extract,reissue,json}.rs`.

In `quesar-server`, add `src/api/{mod,error,fn_router}.rs`.

**Errors.** Move `ApiError` and `ok()` to `api::error` and re-export them from `auth` so M2's paths keep compiling. Add variants, each with name, code, status and a fixed message:

| Variant | Status | Name | Code |
| --- | --- | --- | --- |
| `UnknownFunction` | 404 | `NotFoundError` | `UNKNOWN_FUNCTION` |
| `InvalidBody` | 400 | `ValidationError` | `INVALID_BODY` |
| `MethodNotAllowed` | 405 (+ `Allow`) | `MethodNotAllowedError` | `METHOD_NOT_ALLOWED` |
| `PayloadTooLarge` | 413 | `PayloadTooLargeError` | `PAYLOAD_TOO_LARGE` |
| `Internal` | 500 | `InternalError` | `INTERNAL` |

`Internal` logs its cause at `error` with the function name and never sends it.

**Services that need no database.** `SameOrigin` reads `AuthServices.config.trusted_origins`, so it answers 503 with no database (`extract.rs:128-142`). Add `api::PublicServices` with public fields, starting with `trusted_origins: Vec<String>` (from `AuthConfig::from_lookup(...)`, which needs no pool); Tasks 3 and 4 add theirs. `PublicServices::build(&Config) -> Result<Self, BuildError>` is the production constructor. `AppState` holds it, `SameOrigin` reads it, and `SameOriginOrApple` is unchanged. `router_with(config, auth)` keeps its signature and builds the default; add `router_with_public(config, auth, public)`, which `main` and the tests call, so a test can replace a field (the Turnstile endpoint) before the router is built, as M2's harness replaces `services.hashing`. Add `AppState::database() -> Option<&AuthServices>` for handlers that degrade instead of failing.

**Test harness.** `tests/common` posts only below `/api/auth` (`post_raw`). Add a full-path request helper beside it (same defaults: a trusted `Origin`, a fresh `x-real-ip`) and a way to build the harness without a database and with a replaced `PublicServices`. Do not change the existing helpers' behaviour.

**Router.** `api::fn_router::FnRouter` with `function::<F: ServerFunction, H, T>(handler)`, which mounts `post(handler)` at `/{F::NAME}` and records the name; `finish()` returns the `Router<Arc<AppState>>` and the names. Mount it at `/api/fn` in `router_with` with:
- a fallback answering `UnknownFunction` (any path below `/api/fn`, including malformed percent-escapes, as `route.server.ts:30-41`);
- `method_not_allowed_fallback` answering `MethodNotAllowed`;
- a `SameOrigin` layer on the whole mount (`Router::layer`, which also wraps the fallbacks; not `route_layer`), so it runs before the name or the method is looked at and a cross-site caller cannot probe which names exist (the dispatcher checks origin before the lookup, `route.server.ts:28-29`). A request with no `Sec-Fetch-Site`, `Origin` or `Referer` is therefore 403 on every path and method;
- the `reissue::reissue_cookie` layer, so a refreshed session re-sends its cookie as it does under `/api/auth`.

**Bodies.** `api::body::read::<T>(headers, body, max)` (generalise `auth::json::read`; default `FN_BODY_MAX` 16 KiB): over the cap is `PayloadTooLarge`, anything `serde` refuses is `InvalidBody`. `read_value(…)` returns `serde_json::Value` for handlers that coerce.

**Sessions.** Export `extract::maybe_user(&Parts, &AuthServices) -> Result<Option<AuthUser>, ApiError>` (the existing private `lookup`), so a handler can rate limit first and resolve the session after. `AuthUser` and `MaybeUser` remain the extractors for M4-M6; document on both that under `/api/fn` the mount-level `SameOrigin` has already run.

**Rejections and 405s M2 left as plain text.** Give the `/api/auth` router the same `method_not_allowed_fallback`. List every handler under `auth/routes` that takes a bare axum `Json`, `Query` or `Form` extractor and make its rejection an `ApiError`; a browser-navigation callback that already redirects on a bad query keeps its redirect. Name each changed handler in the report.

Tests (axum `oneshot`; register two fixture functions in the test, one echoing its input, one requiring `AuthUser`; requests carry a trusted `Origin` unless the case says otherwise):
- `POST /api/fn/nope`, `/api/fn`, `/api/fn/`, `/api/fn/a/b`, `/api/fn/%E0%A4%A` give 404 `UNKNOWN_FUNCTION` JSON, never the HTML 404.
- `GET`, `PUT`, `DELETE` on a registered name give 405 with `Allow: POST` and the envelope; so does `GET /api/auth/sign-in`. The same `GET` with no origin headers is 403, not 405.
- The `SameOrigin` table from M2 Task 4 holds on a registered name and on an unknown name (403 before 404). `Sec-Fetch-Site: none` is refused. `Origin: https://evil.example` is refused even when `Host: evil.example` agrees with it.
- No database: the echo function answers 200; the `AuthUser` function answers 503. `VITE_AUTH_ENABLED=false` with a valid cookie: 401.
- Malformed JSON, a 17 KiB body and a wrong field type give 400, 413, 400 with the codes above.
- A handler error mapped to `Internal` answers the fixed message; the log line carries the cause, the response does not.
- A session older than one day calling the `AuthUser` function gets exactly one `Set-Cookie`.
- Every response under `/api/fn` carries `Cache-Control: no-store`.

## Task 3: configuration functions

**Spec source:** `src/lib/inquiries.ts:44-53`; `src/lib/server/turnstile.server.ts:20-48` (`expectedHostnames`, `turnstileState`, `turnstileSiteKey`); `src/lib/quasar/config.ts`; `src/lib/quasar/connection.ts:15-39` (`normalizeOrigin`); `src/lib/server/commerce.server.ts:236-248`; `src/lib/server/commerce-wdbx.server.ts:49-56` (`wdbxOptions`); `src/lib/env.server.ts`.

`quesar-services` has no `url`, `serde_json` or `tracing` dependency today (`serde` and `serde_json` are dev-only): this task adds `url = "2"`; Tasks 4 and 5 name theirs. It does not depend on `quesar-contract`: services return their own types and the `quesar-server` handler maps them to the wire types.

- `quesar-services::text`: `utf16_len(&str)`, `js_trim(&str)`, `utf16_prefix(&str, units)` (cuts on a character boundary, never above `units`).
- `quesar-services::turnstile`: `TurnstileConfig::from_lookup(...)` (values trimmed, blank is unset, as `env()` in `env.server.ts`) holding the site key, the secret (redacted), the lowercased hostname set and `siteverify_url`; `state()` and `site_key()` as the TypeScript's three-state predicate. Verification is Task 4.
- `quesar-services::quasar::normalize_origin(&str) -> Option<String>`: `js_trim`, the TypeScript's pre-check regex by hand (scheme `http`/`https` case-insensitively; no `/ ? # @ \` in the authority; at most one trailing `/`), then `url::Url`, then the same rejections, returning `url.origin().ascii_serialization()`.
- `quesar-services::commerce::readiness(inputs, functions_available: bool)`: `wdbxOptions` on untrimmed values (all four non-empty and absolute; `Environment::raw_pairs`, the rule `quesar_auth::deletion::WdbxConfigGuard` applies privately), trimmed `DATABASE_URL`, a configured public origin, and `SealingKeys::configured()`. The caller in `quesar-server` reads the environment (`readiness::public_origin` lives there, not in this crate) and passes `COMMERCE_FUNCTIONS_AVAILABLE: bool = false` (decision 7).
- `quesar-server/src/api/functions/{mod,config}.rs`: `inquiries.getTurnstileConfig`, `quasar.getQuasarDefaultOrigin`, `commerce.getCommerceReadiness`. Each is limited with `Bucket::AuthGeneral` by `ClientIp` when a database exists. Without a database the limit is skipped, and a limiter error is logged (class only) and the read still answers: these return startup configuration, and a 503 here would hide the Turnstile widget while the server still demands a token. Over the limit is 429. The three values are computed once in `PublicServices::build` (new fields `turnstile`, `quasar_default_origin`, `commerce`).
- `src/lib/server/public-contract.test.ts` (new) writes `server/contract/quasar-origin-vectors.json` under `GEN_CONTRACT_VECTORS=1` from the real `normalizeOrigin`, and otherwise asserts the committed file still matches.

Tests:
- Turnstile state table: no key; no secret; key and secret without hostnames (`misconfigured`, no key exposed); all three (`ready`, only the site key, never the secret); hostnames `" Quesar.Cloud , ,"` parse to one lowercase entry.
- `normalize_origin` against the vectors: default port dropped, host lowercased, trailing slash, IPv6 literal, and refusals for a path, query, fragment, `user@`, a backslash, `ftp:`, the empty string and whitespace.
- Readiness: a complete environment with `functions_available = false` is `configured: false`; with `true`, each missing input alone turns it false, including a relative `WDBX_BINARY` and a whitespace-only `DATABASE_URL`. The handler's answer for a complete environment is `configured: false`.
- HTTP: each function answers the exact JSON in the API reference, without a database too; the 101st call in a window from one address gives 429 with `Retry-After` (injected clock); with the `rate_limits` table dropped the read still answers 200. The secret appears in no response and no `Debug` output.

## Task 4: Turnstile verification

**Spec source:** `src/lib/server/turnstile.server.ts:50-97`; `src/lib/server/turnstile.server.test.ts` (each case).

`quesar-services::turnstile::Verifier::verify(token, expected_action, remote_ip: Option<&str>) -> bool`, on a `reqwest` client passed in. Add to `quesar-services`: `reqwest` 0.12 (`default-features = false`, `rustls-tls`), `serde_json` as a normal dependency and `tracing`. `PublicServices` gains the client (`http`), built in `PublicServices::build` with no redirects and a 10 s timeout, as `AuthServices::build` builds its own.

- Returns false without calling out when the secret is empty, the hostname set is empty, or the token is shorter than 10 or longer than 4096 UTF-16 units (`turnstile.server.ts:68`).
- POSTs form fields `secret`, `response` and, when given, `remoteip`.
- A non-2xx status, a body over 64 KiB (count the chunks while reading; do not trust `Content-Length`), unparsable JSON, a timeout, a redirect or a connection failure is false. The log line names the failure class only: never the token, the secret, the response body or the `reqwest` error text (it can carry the URL).
- True only when `success` is exactly `true`, `action` equals the expected action, and `hostname` is a string whose lowercase form is in the set.
- `quesar-server` adds `api::remote_ip(&ClientIp) -> Option<String>` (decision 10): `Some` only when the value parses as an `IpAddr` that is neither loopback nor unspecified, so `"unknown"` or other header text is never forwarded.

Tests (in-process mock siteverify that records the form it received):
- The cases of `turnstile.server.test.ts`, except its `cf-connecting-ip` case, which decision 10 replaces with the `remoteip` cases below: fails closed without a secret or hostnames; accepts only success, action and hostname together; action and hostname mismatches; a too-short token never reaches the mock; an unreachable endpoint is false.
- `success: "true"` (a string), a missing `hostname`, a hostname differing only in case (accepted), a 4097-unit token (no call), HTTP 500, a 302 to a second mock that would say yes (false, second mock never called), a 65 KiB body.
- `remoteip` is sent for `203.0.113.7`, omitted for `127.0.0.1`, `::1`, `0.0.0.0`, `unknown` and `1.2.3.4, evil`.
- A captured log during a failure contains neither the token nor the secret.

## Task 5: contact inquiries and `inquiries.sendInquiry`

**Spec source:** `src/lib/inquiry-rules.ts` (whole file); `src/lib/server/inquiries.server.ts` (whole file); `src/lib/inquiries.ts:19-39`; `migrations/0003_inquiries.sql`; `src/lib/server/inquiries.server.test.ts`; `src/lib/server/inquiry-logging.server.test.ts`; `server/crates/quesar-auth/src/deletion.rs:309-351`.

- `quesar-services::inquiries::rules` (its own `InquiryInput`, `ValidInquiry` and refusal types; the handler maps them to `quesar_contract`'s): `coerce(&serde_json::Value) -> InquiryInput` (a non-object gives all-empty fields; a non-string field gives `""`; the token is cut to `tokenMax + 1` units with `utf16_prefix`, `inquiry-rules.ts:47-61`; a cut inside a surrogate pair drops the pair, which no valid token contains) and `validate(&InquiryInput)`, with the limits, the check order, the topics and the seven messages of `inquiry-rules.ts:11-22,69-102`. Port the email pattern (`inquiry-rules.ts:63`) by hand: no ECMAScript `\s` character anywhere, exactly one `@`, a non-empty local part, and a domain with a `.` that is neither its first nor its last character.
- `quesar-services::inquiries::insert(conn: &mut PgConnection, user_id: Option<&str>, &ValidInquiry)`: when `user_id` is given, first `select id from "user" where id = $1 for share`; a missing row stores null. Then the insert of `inquiries.server.ts:72-74` (`topic` goes to `project_type`). It takes a connection so the caller owns the transaction.
- `quesar-auth::deletion::purge_and_delete`: make `select id from "user" where id = $1 for update` the first statement of the transaction it opens with `pool.begin()` (before the `workspace_connections` delete). A missing row changes nothing else. The purge keeps inquiries and clears their `user_id` (`update inquiries set user_id = null`, as `account-deletion.server.ts:69`), so the lock is what stops a writer from committing the id after that update. This is the purge half of M2 Task 11's ruling; M4-M5 writers rely on it.
- `quesar-server/src/api/functions/inquiries.rs`, function `inquiries.sendInquiry`, body cap 32 KiB. Order, as `inquiries.server.ts:20-83`:
  1. `Bucket::Inquiry` by `ClientIp`. Over the limit returns result `rate_limited`; a limiter error or no database returns `unavailable`. Both are HTTP 200 inside the `ok` envelope, never 429 or 503: the form reads `code`.
  2. Read and coerce the body, then validate; a failure returns `invalid` with `field` and the rule's message.
  3. Turnstile: `misconfigured` returns that code and logs one fixed line; `ready` verifies the trimmed token with action `inquiry` and returns `verification` on false; `off` skips.
  4. Resolve the session with `maybe_user` (a lookup error counts as signed out), insert in a transaction, return `{ ok: true }`. An insert failure returns `unavailable` and logs one fixed line.
  
  Use the result messages of `inquiries.server.ts` verbatim.
- Extend `public-contract.test.ts` with `server/contract/inquiry-vectors.json`: inputs (including hostile payloads, astral characters at each limit, U+FEFF and U+0085 padding) with the real `coerceInquiryInput`/`validateInquiry` output.

Tests:
- Rules against the vectors, plus each boundary by hand: name 1/2/80/81 units, email 120/121, message 9/10/2000/2001, an unknown topic, a topic differing in case.
- HTTP with a database, mirroring `inquiries.server.test.ts`: anonymous stores null `user_id`; a signed-in sender stores their id; an invalid inquiry stores nothing; five per window then `rate_limited`, and the sixth passes after the clock moves 10 minutes; invalid submissions count against the limit.
- Turnstile configured against the mock: no token gives `verification` with no row; a good token stores one row and calls the mock once; `misconfigured` refuses and never calls the mock.
- Abuse: `user_id`/`userId` in the body is ignored (row has the session's id or null); a body of `[]`, `"x"`, `null` is treated as empty fields (`invalid`, field `name`); malformed JSON and a lone surrogate escape are 400 `INVALID_BODY` (decision 14) and still count one limiter hit; 33 KiB is 413; cross-site `Origin` is 403 and consumes no limiter hit; auth disabled with a valid cookie stores null; an expired or revoked session cookie stores null; a name containing U+0000 passes the rules, fails the insert and returns `unavailable` with no row, no 500 and no driver text in the log (the TypeScript does the same).
- No database: `unavailable`. Dropping the `inquiries` table mid-test: `unavailable`, and the captured log holds the fixed line only (no driver text, no email, no message body).
- Concurrency, without sleeps:
  - while a test holds the writer's open transaction, `select … for update nowait` on that user fails with SQLSTATE 55P03, and while a test holds the purge's lock, `for share nowait` fails likewise;
  - 20 concurrent `sendInquiry` calls from one signed-in user, each from its own client address (`Harness::fresh_ip`; the `inquiry` bucket allows five per address), joined with one `purge_and_delete`: afterwards no `inquiries` row carries the deleted id, the rows that exist number the `{ ok: true }` answers, and every call returned `{ ok: true }` or `unavailable`, never `rate_limited`.
- M2's deletion tests still pass unchanged.

## Task 6: telemetry sink

**Spec source:** `src/lib/server/telemetry.server.ts`; `src/lib/server/telemetry-path.ts`; `src/lib/server/telemetry-routes.server.ts`; `src/routes/api/telemetry.ts`; `migrations/0004_telemetry.sql`; `src/lib/server/telemetry.server.test.ts`; `server/crates/quesar-server/src/body_limit.rs`.

- `public-contract.test.ts` writes `server/contract/telemetry-routes.json`: `files` (the sorted output of `routeFiles()`) and `vectors` (inputs with the real `normalizeTelemetryPath(…, appRoutePatterns())` output). Without the flag it asserts `files` equals the current glob, so adding a route fails vitest until the file is regenerated.
- `quesar-services::telemetry`: `RoutePatterns::from_files` porting `routePatternsFromFiles` (`telemetry-path.ts:41-79`: flat and directory names, `index`, `route`, groups, pathless `_` segments, trailing-underscore escape; files with a `__root` or `-`-prefixed segment, splats and `api` skipped); dynamic routes are matched segment by segment with a hand-written slug check equal to `SLUG` (`telemetry-path.ts:21`), no regex crate. `normalize_path(&Value, &RoutePatterns) -> String` as `telemetry-path.ts:82-93`. `EVENTS` as `telemetry.server.ts:22-28`. The patterns are built once at startup from the embedded contract file (`include_str!`).
- `quesar-server/src/api/telemetry.rs`, `POST /api/telemetry`, in the order of `telemetry.server.ts:43-75`. The handler takes the raw `Request`: a body extractor in its signature (`LimitedJson`) would read the body before steps 1 and 2.
  1. `DNT: 1` or `Sec-GPC: 1` answers 204 and writes nothing, not even a limiter row. The TypeScript compares `Headers.get` (repeated lines joined with `, `, so `1, 1` does not match); Rust honours the opt-out when any one line, trimmed, is `1`. That departure only ever stores less.
  2. `Bucket::Telemetry` by `ClientIp`: over the limit is 429 `{"error":"Too many requests. Try again shortly."}`; a limiter error (logged, class only) or no database is 204.
  3. `body_limit::read_json_limited(&headers, body, TELEMETRY_BODY_MAX)`: 413 and 400 with `body_limit`'s existing bodies.
  4. An event that is not a string in `EVENTS` is 400 `{"error":"Unrecognized event name."}`.
  5. Insert `(event, normalized path)`; a failure is logged (class only) and swallowed. 204.
- Other methods answer 405 through the envelope fallback.

Tests:
- Pattern and path tests against the vectors, and by hand each case of `telemetry.server.test.ts:36-128` (`/u/victim@example.com`, query and fragment dropped, 129-unit path dropped not truncated, non-strings, `constructor`, trailing slash, a deeper path under a dynamic family).
- HTTP: stored event and path; unknown path stored as `""`, never verbatim; unknown event 400; `[]` 400; a 5000-character path 413; DNT and Sec-GPC store and count nothing (assert `rate_limits` has no `telemetry` row), and a 5000-character body with `DNT: 1` is 204, not 413; an oversize body from a client already over the limit is 429, not 413; 120 allowed then 429 (injected clock), allowed again in the next window.
- A chunked body with no `Content-Length` over 4 KiB is 413; no database is 204; a dropped table is 204.
- The row holds only event, path and time: no IP, user agent or cookie reaches the table or the log, even with a session cookie on the request.

## Task 7: CSP report sink

**Spec source:** `src/lib/server/csp-report.server.ts`; `src/routes/api/csp-report.ts`; `src/lib/server/csp-report.server.test.ts`; `server/crates/quesar-server/src/csp.rs` (`REPORTING_ENDPOINTS`).

`quesar-server/src/api/csp_report.rs`, `POST /api/csp-report`:
1. `Bucket::CspReport` by `ClientIp` first: over the limit is 429 with the same `{"error":…}` body as telemetry; a limiter error is 204 and logged (class only; the TypeScript logs it, `csp-report.server.ts:30-36`); no database is 204 with no log line per request. In neither case is the report itself logged.
2. `read_text_limited(…, CSP_REPORT_BODY_MAX)` called inside the handler, after step 1 (no body extractor in the signature): over the cap or an aborted stream is 413.
3. A non-empty body is logged at `warn` as one event: the first `CSP_LOG_LIMIT` (`csp-report.server.ts:19`) UTF-16 units, recorded as a `Debug`-escaped field so a report cannot forge log lines. Nothing is stored.
4. 204 with an empty body. The handler never answers 5xx and never reads a cookie.

Tests: each case of `csp-report.server.test.ts` (legacy body logged, a Reporting API array truncated to the limit, 64 KiB + 1 gives 413, 60 then 429 without logging); a body containing `\n` and ANSI escapes appears escaped on one line; invalid UTF-8 does not fail; an empty body logs nothing; a cross-site request without credentials is accepted; the path named by `csp::REPORTING_ENDPOINTS` is the mounted route.

## Task 8: completeness, smoke script, progress log

**Spec source:** this plan's API reference; `scripts/smoke.sh`; parent plan "Verification".

- A route-table test: every `quesar_contract` `FUNCTIONS` name is mounted, and every mounted name is in `FUNCTIONS` (M4-M6 keep it green by construction).
- A mode matrix test over every M3 route: with a database; without one; `VITE_AUTH_ENABLED=false`; production not ready (the readiness gate answers 503 for all of them).
- `scripts/smoke.sh` (it starts the server with no database and no `PUBLIC_ORIGIN`, so the trusted origins are the local development ones; send `Origin: http://localhost:8080` where a request must pass): unknown function 404 JSON; `POST /api/fn/inquiries.getTurnstileConfig` with a foreign `Origin` 403, and with no origin headers 403; with the trusted `Origin` 200; `GET` with the trusted `Origin` 405; telemetry with `DNT: 1` 204; a small CSP report 204 (the 413 needs a database, because the limiter branch answers first; the Task 7 tests cover it).
- Parity note in the report: the same inquiry, telemetry and CSP requests against the Node dev server and the Rust server, with status and JSON shape compared (results differ only by the envelope decisions above).
- Append the M3 entry to the parent plan's progress log, including `COMMERCE_FUNCTIONS_AVAILABLE` and the purge lock for M4-M6.

## API reference

Function routes are `POST /api/fn/<name>` with a JSON body (the input itself) and answer `{"ok":true,"result":R}` or `{"ok":false,"error":{"name","code","message"}}`, always `Cache-Control: no-store`. Generated types: `src/lib/api/generated/`.

Errors common to every function: 403 `CrossSiteRequestError` (not same-origin; checked before the name); 404 `NotFoundError`/`UNKNOWN_FUNCTION`; 405 `MethodNotAllowedError`; 400 `ValidationError`/`INVALID_BODY`; 413 `PayloadTooLargeError`; 429 `RateLimitedError` with `Retry-After`; 500 `InternalError`; 503 (the readiness body) while a production server is not ready. Per-user functions (M4-M6) add 401 `UnauthorizedError` ("Unauthorized") and, without a database, 503 `AuthUnavailableError`.

| Name | Auth | Request | Result | Notes |
| --- | --- | --- | --- | --- |
| `inquiries.sendInquiry` | optional session (sender linked when signed in) | `{name, email, company, topic, message, turnstileToken}`, all strings; missing or non-string fields count as `""`; cap 32 KiB | `{ok: true}` or `{ok: false, code, error, field?}` with `code` one of `invalid`, `rate_limited`, `verification`, `misconfigured`, `unavailable` and `field` one of `name`, `email`, `company`, `topic`, `message` | Domain refusals are HTTP 200 inside `result`; bucket `inquiry`; never 429 |
| `inquiries.getTurnstileConfig` | none | none | `{state: "off"}`, `{state: "misconfigured"}` or `{state: "ready", siteKey}` | bucket `auth-general`; 429 over the limit; answers without a database and when the limiter fails |
| `quasar.getQuasarDefaultOrigin` | none | none | an origin string or `null` | as above |
| `commerce.getCommerceReadiness` | none | none | `{configured: boolean, paymentMode: "manual_invoice", storage: "wdbx"}` | `configured` is `false` until M6; otherwise as above |

`inquiries.sendInquiry` can still answer the common 400 (`INVALID_BODY`: the body is not JSON), 403, 405 and 413; it never answers 401, 429 or 503 `AuthUnavailableError`. With Turnstile `ready`, `turnstileToken` must be the widget's token for action `inquiry`.

Plain endpoints (no envelope, no same-origin check, bodies as the TypeScript's; the 405 for another method is the one enveloped answer):

| Method, path | Request | Responses |
| --- | --- | --- |
| POST `/api/telemetry` | `{event, path?}`, cap 4 KiB; `event` one of `page_view`, `inquiry_open`, `inquiry_submit`, `inquiry_success`, `inquiry_close` | 204 (stored, or `DNT`/`Sec-GPC`, or no database); 400 `{"error"}` (not a JSON object, unknown event); 413 `{"error"}`; 429 `{"error"}` |
| POST `/api/csp-report` | any body, cap 64 KiB | 204; 413 `{"error"}`; 429 `{"error"}` |

Existing and unchanged: `GET /api/auth/methods` is the sign-in methods read for M7.

M7 notes:
- `serverFn("inquiries.sendInquiry")` posts the input object directly; there is no `{data}` wrapper and no seroval.
- A cross-site refusal now arrives as a named error, not a decode failure.
- `quasarDefaultOrigin()` and the Turnstile widget keep their `staticSite` branches.

## Risks and open questions

1. **ts-rs output and the repo's TypeScript settings.** Generated files must typecheck under TypeScript 6 with the repo's `tsconfig`. Default: one file per type with `import type`; if a construct fails `bun run typecheck`, shape the Rust type (not a post-processing step) until it passes, and report it.
2. **`InquiryResult` as a boolean-tagged union.** serde has no boolean tag. Default: a hand-written `Serialize` and a hand-written `TS` declaration for that one type, covered by the round-trip test.
3. **Telemetry allowlist freshness.** The Rust server embeds the route list at build time; a route added without regenerating the contract file fails vitest, not cargo. Default: accept, since `bun run check` runs both. M7 renames `/quasar/site/$id`, and regenerates the file then.
4. **Telemetry accepts cross-site posts** (as the TypeScript does). The event and path allowlists and the per-client limit bound what a third party can write. Default: keep parity; do not add a Fetch-Metadata check in M3.
5. **Rate-limit bucket for the three configuration reads.** The TypeScript has none. Default: `auth-general` by client address (so these reads share one 100-per-10-seconds budget per address with `/api/auth/methods` and the other address-keyed auth routes), skipped without a database, and failing open when the limiter errors. If the review prefers a dedicated bucket, it is a one-line change in `rate_limit.rs` plus its table test.
6. **`AuthServices` now serves non-auth handlers** (pool, limiter, clock). Default: keep the name in M3 and reach it through `AppState::database()`; M4 may rename it when it adds its own services.
7. **Session lookup after the rate limit in `sendInquiry`** differs in order from the TypeScript (middleware first). The observable results are the same; the Rust order spends no database read on a refused caller.
8. **Commerce readiness reads `PUBLIC_ORIGIN` or `BETTER_AUTH_URL`** and ignores `BETTER_AUTH_SECRET` (decision 7). If Donald wants the secret to stay a precondition until M8, it is one more term in `readiness(...)`.
9. **The purge now takes a row lock on `"user"`.** A long-running writer transaction would delay account deletion. Default: writers hold the share lock only around their insert (no outbound call inside the transaction; Turnstile runs before it).
10. **Exceptions to "never change `src/`" need the owner's acceptance.** The brief forbids changes under `src/` and also puts the generated types in `src/lib/api/generated/`. This plan adds that directory (Task 1), one entry each in `.prettierignore` and `eslint.config.ts` for it, and one new vitest file, `src/lib/server/public-contract.test.ts`, which follows the M1 precedent (`rate-limit-contract.test.ts`, `crypto-contract.test.ts`). No existing file under `src/` is edited. Default: proceed; if the ignore entries are refused, Task 1 instead makes the generator emit prettier-clean, lint-clean files and proves it with `format:check` and `lint`.
11. **`ts-rs` is not pinned here** (no cargo run was possible while planning). Default: Task 1 pins the newest release that builds on `rust-version` 1.90 and records it; if its output needs a feature flag to avoid `bigint` or to emit `import type`, the report says which.
12. **A U+0000 in an inquiry field returns `unavailable`** ("Try again in a moment"), as the TypeScript does, although retrying cannot help. M4's plan turns the same input into a `ValidationError` for its functions. Default: keep parity in M3; changing it to `invalid` is one check in `rules::validate` and needs a decision on which field message to show.
13. **Commerce readiness is forced to `configured: false` until M6** (decision 7). The alternative is to report the environment-only answer from M3 on. Default: forced false, because the frontend does not reach the Rust server until M7 and M6 lands first.
14. **`trusted_origins` is empty in production without a valid `PUBLIC_ORIGIN`/`BETTER_AUTH_URL`.** Then only requests with `Sec-Fetch-Site: same-origin` pass `/api/fn`. Default: accept; production readiness already refuses traffic without a valid HTTPS public origin (`readiness.rs`, `auth_origin_invalid`).
