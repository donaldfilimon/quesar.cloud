# Rust server M5: workspace connectors

Parent plan: `notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md` (milestone M5; see "Reused contracts, ported exactly" and the crate table). M2 gave us sessions, the `AuthUser`/`SameOrigin` extractors, the `ApiError` envelope, `AuthServices`, the OAuth building blocks under `quesar-auth/src/oauth/` and the `WorkspaceRevoker` hook in `quesar-auth/src/deletion.rs`. M3 gave us `quesar-contract`, `quesar-server/src/api/` (`api::error`, `router_with_public`), `quesar_services::text` and the purge's `select ... for update` on the user row (M3 Task 5); M4 gave us `quesar_auth::user_lock::share` (M4 Task 3), `crypto::digest`, `SignedInServices.sealing` and the `quesar-services -> quesar-auth` dependency (M4 Task 1). M5 ports the workspace data connectors (not sign-in): per-user Google Drive and Microsoft SharePoint/OneDrive OAuth, the sealed refresh-token store, the two file listings, and the real revoker for account deletion. The frontend does not change (M7 points it at the API reference below); the Node server stays the parity oracle until M8.

## Global Constraints

- **The TypeScript file named in each task is the behavioural spec.** Port its behaviour, formats, constants, bucket names, reason strings and error cases exactly. Where this plan and the TypeScript disagree on a value, the TypeScript wins; say so in the report. Where this plan *deliberately* departs (listed under "Decisions"), follow the plan and cite the item.
- Work only under `server/`, `scripts/`, `package.json`, `.gitignore` and the files a task names. Do not change `app/`, `docs/`, existing `migrations/*.sql` or any existing file under `src/`. Exceptions: the new `migrations/0011_workspace_flows.sql` (Task 2; take the next free number if 0011 is used), the new `src/lib/workspace-connectors/workspace-contract.test.ts` with its output `server/contract/workspace.json` (Task 1), and regenerated `src/lib/api/generated/*`.
- Rust: edition 2024, `unsafe` forbidden, `cargo fmt` clean, `cargo clippy --all-targets -- -D warnings` clean. No `unwrap`/`expect`/`panic!` outside tests and `main`'s startup path. Errors are typed enums implementing `std::error::Error`.
- Crates live in `server/crates/<name>/` and inherit `edition`, `rust-version`, `publish` and `[lints]` from the workspace. `sqlx` 0.8, runtime-checked queries only (`sqlx::query`, never the `query!` macros).
- Tests that need Postgres read `TEST_DATABASE_URL` and **fail** (naming `scripts/dev-postgres.sh`) when it is unset; they use `quesar_db::test_support::TestDatabase`. Tests that need no database must not require one.
- `bun run check:server` passes at the end of every task, from the repo root; `bun run test` stays green apart from the known `commerce.server.test.ts` failure. Commit `server/Cargo.lock` when dependencies change.
- Commit messages: conventional commits (`feat(server): ...`), ending with the two trailer lines the dispatch gives.

Additions for this milestone:

- No refresh token, access token, authorization `code`, `state`, PKCE verifier, binding cookie, client secret or sealed envelope in logs, errors or `Debug`. Hold each in a newtype whose `Debug` prints `[redacted]` and that zeroizes on drop (`quesar_auth::ClientSecret`, `SecretToken`, `Verifier`, or a new `WorkspaceToken`). Provider failures are logged as provider name plus status only, as `oauth.server.ts:281-312` and `remote.server.ts:45-57` do. Outbound `Authorization` values are marked sensitive. Random values come from the OS RNG (`SecretToken::generate`, `Verifier::generate`); the binding hash is compared in constant time.
- Every route resolves the session first (`AuthUser`), then hits `Bucket::Workspace` keyed by `auth.user.id` (`gate.server.ts:42`), before it touches a provider, the token store or the request's parameters. Every query is scoped by `auth.user.id`; the provider slug from the path is validated before it indexes anything (`oauth.server.ts:32-35`).
- **Lock order.** The one inserting writer (`save`) runs `quesar_auth::user_lock::share` first in its transaction and stops if the user is gone. No lock and no transaction is held across an outbound HTTP call.
- Time is injected: every expiry comparison (flow, access-token cache, listing window) uses `services.clock`. SQL never calls `now()` or relies on a column default for a value this milestone writes (`connected_at`, `updated_at`, the flow's `created_at`/`expires_at` are all bound). No sleeps in tests.
- Outbound HTTP is never real in tests. Every provider URL is a field of `WorkspaceConfig` with the production URL as default and no environment override; tests point them at the in-process mock of Task 3 and build clients with `.no_proxy()`. The workspace `reqwest::Client` follows no redirects and has a 10 s total timeout (the M2 rule; the TypeScript's token and identity calls have none); in production every URL must be https (`oauth::http::check_url`).
- **Cancellation.** axum drops a handler's future when the browser disconnects, and a deadline drops it too. A sequence that spends something at the provider and must then write to the database (code exchange then `save`; refresh then the rotated-token write-back) runs inside `tokio::spawn` and the handler awaits the join handle, so a dropped request cannot leave a spent code or a rotated refresh token unstored (decision 13).
- Sealing uses `SealingKeys` with the associated data of `tokens.server.ts:78-80`. Without a usable `APP_ENCRYPTION_KEY` nothing is stored and connect refuses before a flow starts.

## Decisions and where the code contradicts the brief

1. **The routes stay `/api/workspace/*` with their methods; they do not move under `/api/fn`.** `connect` and `callback` are top-level navigations that answer 302 (`handlers.server.ts:86-116,128-202`); the callback URL is registered with Google and Microsoft (`oauth.server.ts:131-133`); and `/api/fn` is POST-only behind a mount-level `SameOrigin` (M3 decision 5), which a provider redirect can never pass. The three JSON reads and `disconnect` keep their paths too, so `client.ts:27-56` and `sources.ts:358,365` need no change at M7. This milestone therefore adds no `/api/fn` route.
2. **Bodies.** Success bodies keep the TypeScript's flat shape (`{ ok: true, providers }`, `{ ok: true, removed, revoked }`, `{ ok: true, connected, files, reason? }`), because the client reads those fields directly. Error bodies change from bare `{ "error": "…" }` (`gate.server.ts:21-23`) to the M2 envelope `{ ok: false, error: { name, code, message } }` with the same statuses: the client reads only `response.ok`/`status` on failure (`client.ts:31,53`, `sources.ts:204-206`). Success responses carry `Cache-Control: private, no-store` (`handlers.server.ts:52`); errors carry the envelope's `no-store`.
3. **Flow state moves from a self-contained cookie to an `auth_flows` row.** The TypeScript keeps nonce, PKCE verifier and provider in the cookie itself (`oauth.server.ts:152-160`) and compares the nonce with `state`. Rust follows M2: the row holds SHA-256(state), SHA-256(binding), the verifier, the provider and the user id; the cookie carries only the binding value. Gains: single use (`delete ... returning`), the verifier never reaches the browser, and the flow is bound to the user who started it. The cookie keeps its name and attributes (`oauth.server.ts:137-138,210-216`). This needs a new `kind` value, hence migration 0011: a workspace flow must not be consumable by `/api/auth/callback/google`, which reads `kind = 'oauth'` (`oauth/flow.rs` `consume`).
4. **Origin.** `requestOrigin` trusts the request URL and `x-forwarded-proto` (`oauth.server.ts:120-125`). Rust never reads either (parent plan: compare against `PUBLIC_ORIGIN`, never the proxied `Host`): the redirect URI and the return redirect are built from `oauth::provider::base_origin(&config)`.
5. **Same-origin rule.** The gate applies only Fetch-Metadata (`assertSameSiteRequest`) to every route, including the POST. Rust keeps that for the four GETs (`AuthUser` runs the same rule; two of them are navigations, one cross-site) and adds `SameOrigin` to `POST disconnect`, per the binding decision for state-changing routes. The browser's own `fetch` passes both.
6. **Auth off and no database.** The TypeScript answers 503 "Sign-in is not available" when auth is disabled on a real database, and resolves `dev-user` without one. Rust has no dev user (M2 ruling): with `VITE_AUTH_ENABLED=false` every workspace route answers 401 `UnauthorizedError`; with no database, 503 `AuthUnavailableError`. `/api/workspace` is outside the `/api/auth` default-deny guard and needs no allow-list entry because no route there can issue a session.
7. **"Revoke per connection" is weaker than it sounds.** `revokeGrant` returns false for Microsoft without calling anything (`oauth.server.ts:344-350`), and for Google when credentials are missing or the token does not open (`tokens.server.ts:187-209`). The Rust revoker ports that: `available()` is true, Microsoft is always `false`, and the M2 purge logs a `warn` naming the provider. Deletion proceeds (best effort), as the TypeScript does.
8. **The purge check is `delete ... returning provider, sealed`, not just `provider`.** A reconnect between the revoke and the transaction replaces the token under the same provider name; comparing envelopes catches it. See Task 7.
9. **Google credentials are shared by default.** Sign-in falls back to `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET` (`quesar-auth/src/config.rs:203-205`); the workspace client reads only those two (`oauth.server.ts:62-63`). The two flows differ by redirect URI, scope, `kind` and cookie, so sharing a client is safe.
10. **No re-seal on rotation.** `tokens.server.ts` calls `open`, which discards `rotated` (`crypto.server.ts:131-133`): a token sealed under `APP_ENCRYPTION_KEY_PREVIOUS` opens and is left as it is. Rust ports that with `SealingKeys::open`. Consequence in Risks.
11. **A stored row with no key at all reports `connected: true`.** `opens` returns true on `EncryptionUnavailableError` (`tokens.server.ts:99-108`), so the row lists as `configured: false, reason: "encryption_not_configured", connected: true, stored: true` (`handlers.server.ts:234-248`). Ported as is. The UI tests `reason === "reauth_required"` first and `configured` second (`workspace-sources.tsx:361-369`); here the blocker wins `reason` (`handlers.server.ts:242`), so the panel shows "not available", not "reconnect".
12. **Response size.** The TypeScript reads provider bodies without a cap. Rust keeps M2's 64 KiB cap for token and identity endpoints and uses 2 MiB for the two listings (100 Graph items with `remoteItem` wrappers exceed 64 KiB); above the cap is the listing's 502.
13. **Two sequences are made cancellation-safe; the TypeScript has no equivalent concern.** The callback's exchange-then-save and `access_token`'s refresh-then-write-back each run in a spawned task (Global Constraints). The listing deadline (`handlers.server.ts:318-323`, where the abort signal reaches only the listing call) bounds the handler's wait for mint plus listing; when it fires during a mint the handler answers 502 and the detached mint still finishes its write-back.
14. **A grant whose owner vanished is revoked.** If `save` reports `UserGone` after a successful exchange, the callback calls `revoke_grant` with the fresh refresh token (best effort) before redirecting with `connection_failed`. The TypeScript cannot hit this case (its insert has no user check). It follows the M2 ruling that a live grant is never left behind for a deleted account. Other save failures do not revoke: for Google a revoke ends the whole grant, which would also kill an existing working connection over a transient database error.

## Task 1: contract vectors, wire types, configuration

**Spec source:** `oauth.server.ts:29-133` (providers, scopes, credentials, tenant, redirect URI), `handlers.server.ts:54-67,206-224` (`ConnectBlocker`, `ProviderConnectionRow`), `sources.ts:24-43,93-101`, `config.server.ts:91-92`, `tokens.server.ts:78-80`, `remote.server.ts:20-43,64-91,122-160`; generator pattern `src/lib/server/crypto-contract.test.ts`.

- `src/lib/workspace-connectors/workspace-contract.test.ts` (new; `GEN_CONTRACT_VECTORS=1` rewrites, otherwise asserts equality) writing `server/contract/workspace.json`:
  - `scopes` and `extraAuthorizeParams` per provider, and `buildAuthorizeUrl` output for fixed inputs for both providers, with the tenant unset, `contoso.onmicrosoft.com` and a value needing escaping;
  - `workspaceRedirectUri` and `workspaceAad` samples;
  - the RFC 7636 challenge pair (`oauth.server.test.ts:130`);
  - the two cookie strings;
  - `mapDriveFile` and `mapGraphItem` inputs and outputs (every case of `remote.server.test.ts:49-111`, plus string and numeric sizes, a `remoteItem` wrapper, a folder, a non-RFC-3339 date);
  - `kindFromMimeType` cases; `windowStartIso` for fixed `now`;
  - `requestedDays` for `""`, `"7"`, `" 12"`, `"+5"`, `"30abc"`, `"0"`, `"-3"`, `"1e3"`, `"9999"`, a 25-digit number, absent;
  - a fixed key pair with one envelope sealed under the current key and one under the previous key for `workspace:google:u1`. Envelopes carry a random IV, so without the flag the test asserts that the committed envelopes still open to the committed plaintext, not byte equality (the rule of `crypto-contract.test.ts`).
  The test sets and restores the `process.env` names it reads. Run prettier, typecheck and lint on it.
- `quesar-contract/src/workspace.rs`: `WorkspaceProvider` (`google`, `microsoft`), `ConnectBlocker`, `ConnectionReason` (blockers plus `reauth_required`), `ProviderConnection` (camelCase fields of `handlers.server.ts:206-224`), `ConnectionsResult`, `DisconnectResult`, `WorkspaceFileKind`, `WorkspaceSourceId`, `WorkspaceFile` (`sizeBytes` exported as `number | null`, never `bigint`), `FilesReason` (blockers, `not_connected`, `reauth_required`), `FilesResult` (the two shapes keyed by `connected`; `reason` absent when connected). Export them through ts-rs as plain types; they are not `ServerFunction`s, so add a types list to `export.rs` if M3's only walks functions.
- `quesar-services/src/workspace/{mod,config,provider}.rs`:
  - `Provider::{Google, Microsoft}` with `parse(&str) -> Option<Self>`, `as_str`, `label` (`oauth.server.ts:55,70`), `source_id`, `scopes`, `extra_authorize_params`.
  - `WorkspaceConfig::from_lookup(lookup, production)`: `google`/`microsoft: Option<WorkspaceClient { client_id, client_secret: ClientSecret }>` (both values present after trimming, as `env()` does), `endpoints: WorkspaceEndpoints` (authorize, token, revoke, identity, listing per provider; Microsoft's authorize and token built from `MICROSOFT_OAUTH_TENANT`, default `common`, percent-encoded as `encodeURIComponent` does, `oauth.server.ts:49-51,85-90`), `listing_deadline` (`handlers.server.ts:320`), `allow_http = !production`.
  - `connect_blocker(provider, &config, &sealing) -> Option<Blocker>`: provider first, then key (`handlers.server.ts:62-67`). A malformed key counts as not configured (`handlers.server.test.ts:84`). `Blocker` and the other domain enums are `quesar-services`' own; `quesar-server` maps them to the `quesar-contract` types, as M3 does for inquiries (`quesar-services` does not depend on `quesar-contract`).
- First check the M3/M4 surface this plan names (Risk 10) against the code and create only what is missing. If `quesar-services` does not yet depend on `quesar-auth` (M4 Task 1), add it.

Tests: every vector section that Task 1's Rust covers (scopes pinned exactly, so a write scope cannot be added silently; tenant escaping; blocker order for the four key/credential combinations, including a malformed key); `Provider::parse` refuses `""`, `Google`, `google `, `apple`, `__proto__`; contract JSON round trips against literals from `handlers.server.test.ts:241-270`; the drift test regenerates and passes; `Debug` of `WorkspaceConfig` shows no secret.

## Task 2: migration 0011 and the workspace flow

**Spec source:** `oauth.server.ts:135-249` (state, PKCE, cookie, authorize URL); `quesar-auth/src/oauth/flow.rs` (the pattern); `migrations/0010_rust_auth.sql:35-46`.

- `migrations/0011_workspace_flows.sql`: replace the `kind` check on `auth_flows` so it also allows `'workspace_oauth'` (`alter table ... drop constraint if exists auth_flows_kind_check`, then add it back with the four values). It must apply on PGLite: run `bun run test`. Extend `quesar-auth/tests/schema.rs` for the new value.
- `quesar-services/src/workspace/flow.rs`:
  - `start(pool, user_id, provider, now) -> Started { state, binding, challenge }`. First deletes this user's earlier `workspace_oauth` rows for the same provider, then inserts `kind = 'workspace_oauth'`, `provider`, `user_id`, both hashes, `payload = { verifier }`, `expires_at = now + STATE_MAX_AGE` (`oauth.server.ts:138`).
  - `consume(pool, state, user_id, provider, now) -> Option<Flow { verifier, expired }>`: one `delete ... where state_hash = $1 and kind = 'workspace_oauth' and user_id = $2 and provider = $3 returning binding_hash, payload, (expires_at <= $4)`; `Flow::binding_matches(&str)` compares hashes in constant time. A row for another user or provider is left alone and reported as none.
  - `discard(pool, state, user_id)` for the provider-denied path.
  - `state_cookie(&SecretToken)`, `clear_state_cookie()`, `read_state_cookie(&HeaderMap)` with the name and attributes of `oauth.server.ts:137,210-216`; reading accepts only a 43-character base64url value.
  - `authorize_url(&config, provider, redirect_uri, state, challenge)` with the parameter set of `oauth.server.ts:236-248`; `redirect_uri(&AuthConfig, provider)` = `<base_origin>/api/workspace/callback/<provider>`.

Reused from M2, unchanged: `token::{SecretToken, token_hash}`, `oauth::pkce::Verifier`, `ids::new_id`, `session::maybe_prune` (it already deletes expired `auth_flows` rows of every kind), `Clock`. Not reused: `flow::start`/`consume` (typed to the sign-in `ProviderId`, a nonce and return paths), `oauth::paths`, `id_token`, `jwks`, `link`, the `__Host-quesar.oauth_binding` cookie.

Tests (DB): authorize URLs equal the Task 1 vectors byte for byte; a flow is consumed once, and the second consume finds nothing; two concurrent consumes yield exactly one flow; expiry on the injected clock at the boundary; wrong user, wrong provider and a sign-in `kind = 'oauth'` row with the same state hash are not consumed and not deleted; `quesar_auth::oauth::flow::consume` does not see a workspace row; starting twice leaves one row; deleting the user cascades the flow; cookie strings equal the vectors; a cookie of the wrong length or alphabet reads as none; `Debug` of `Started`/`Flow` is redacted.

## Task 3: provider client, listings and the mock provider

**Spec source:** `oauth.server.ts:251-380` (token response, exchange, revoke, refresh), `remote.server.ts` (whole file), `sources.ts:93-101`; `quesar-auth/src/oauth/http.rs`; `quesar-auth/tests/support/mock_idp.rs` (the mock pattern).

- `quesar-auth/src/oauth/http.rs` (additive only): `post_form_status(...) -> Result<u16, HttpError>` for an endpoint whose body is not read (revocation), and a `get_json_authorized` variant taking the response cap. Existing callers keep 64 KiB.
- `quesar-services/src/workspace/oauth.rs`:
  - `TokenGrant { access: WorkspaceToken, refresh: Option<WorkspaceToken>, expires_at_ms, scope }` parsed by the rules of `oauth.server.ts:265-279` (non-positive, missing or non-number `expires_in` falls back, a numeric string included; empty `refresh_token` is none; the skew constant of line 263; "now" from the clock; the arithmetic saturates, so a huge `expires_in` cannot overflow or panic).
  - `exchange_code(...)` and `refresh(...)` with the form fields of `oauth.server.ts:323-330,373-378`.
  - `revoke_grant(...) -> bool`: Google only, fields of `oauth.server.ts:355-359`, true on a 2xx, false on any failure, and no call at all for Microsoft.
  - `ProviderError::{Status(u16), Unreadable, NoAccessToken, Network, TooLarge, Insecure}` (mapped from `HttpError`) whose `Display` holds the provider name and status only.
- `quesar-services/src/workspace/remote.rs`: `window_start_iso(days, now)` (JavaScript `toISOString` format, millisecond precision), `kind_from_mime_type`, `map_drive_file`, `map_graph_item`, `fetch_drive_files` (query parameters of `remote.server.ts:99-106`), `fetch_graph_files` (`$top`, then the local window filter of lines 186-190), `fetch_account_email` (best effort, field order of line 217, none on any failure). Dates are RFC 3339 in, `toISOString` form out; a row whose date does not parse is dropped.
- `quesar-services/src/workspace/mock.rs` under a `test-support` feature: `MockWorkspaceProvider::start()` on `127.0.0.1:0`, serving token, revoke, identity and both listing paths; a response queue per path (status, body, or "hold until released"); `endpoints() -> WorkspaceEndpoints`; `requests()`/`requests_to(path)` recording method, path, decoded query, `authorization` and decoded form.

Tests (no database; mock):
- exchange posts exactly the six fields with the verifier and redirect URI, and parses a grant;
- a 400 whose body contains the code and the secret yields an error whose `Display` and `Debug` contain neither;
- a 200 with an unparseable body and a 200 without `access_token` are refused;
- a refresh answer without `refresh_token` is non-rotating;
- a 302 from the token endpoint is refused, not followed;
- an `http://` endpoint is refused when `allow_http` is false;
- revoke sends token, client id and secret to the revoke URL and reports true; a 400 and a dropped connection report false; Microsoft records zero requests;
- every mapping, kind and window vector from Task 1;
- the Drive request carries the bearer token and the exact query;
- Graph rows older than the window are dropped;
- a body with no `files`/`value` array is an empty list;
- a listing over the cap is `TooLarge`;
- a provider 500 whose body echoes the token yields a status-only error.

## Task 4: the sealed token store and access-token cache

**Spec source:** `tokens.server.ts` (whole file) and `tokens.server.test.ts`; `migrations/0006_workspace_connections.sql`; M2 ruling (progress.md line 75); M4 Task 3 (`user_lock::share`).

`quesar-services/src/workspace/store.rs` and `tokens.rs`, behind `WorkspaceService { pool, sealing, config, http, clock, cache }`:

- `aad(user_id, provider)` = `tokens.server.ts:78-80`.
- `save(conn: &mut PgConnection, SaveInput)`: seal first (no key means an error and no write), then in the caller's transaction `user_lock::share`; a missing user is `StoreError::UserGone` and nothing is written; then the upsert of `tokens.server.ts:128-135` with `connected_at` and `updated_at` bound from the clock on insert; on conflict `connected_at` is left alone, as the TypeScript leaves it (a reconnect keeps the first connection date). The caller drops the cache entry after its commit.
- `list(user_id) -> Vec<ConnectionSummary { provider, account_email, scope, connected_at, needs_reauth }>` ordered by provider. `needs_reauth` follows `opens` (`tokens.server.ts:99-108`): true only when a key is configured and the envelope fails to open. `CryptoError::{NotConfigured, InvalidKey}` are the TypeScript's `EncryptionUnavailableError`; every other variant is its `SealedDataError`.
- `read_refresh_token(user_id, provider)`, `delete(user_id, provider) -> bool` (`delete ... returning`, cache entry dropped).
- `revoke_and_delete(user_id, provider) -> Disconnected { removed, revoked }`: the revoke half never fails the call (`tokens.server.ts:187-209`); only a database error does.
- `access_token(user_id, provider) -> Result<WorkspaceToken, AccessError::{NotConnected, Reauth, Unavailable, Provider(..), Database(..)}>`: the algorithm of `tokens.server.ts:251-304` step for step: credentials, row read, cache hit only when the stamp matches and the entry has not expired, open, refresh, compare-and-swap write-back of a rotated refresh token on the envelope read (`284-287`, `updated_at` from the clock), re-read, cache only when the stamp still matches, and `NotConnected` when the row vanished meanwhile. The stamp is `updated_at` plus `crypto::digest(sealed)` (`tokens.server.ts:61-63`). Everything from the refresh request to the cache insert runs in one spawned task (decision 13); the write-back is an `update`, so it can never recreate a row the purge removed and needs no user lock.
- The cache is a `Mutex<HashMap>` of zeroizing tokens keyed by provider and user; the lock is never held across an await; expired entries are swept on insert.

Tests (DB and mock), re-proving `tokens.server.test.ts`:
- the stored row contains no plaintext token in any column;
- no key: `save` errors and the table is empty;
- an envelope copied to another user or to the other provider slot is `Reauth` and never reaches the provider;
- the Task 1 envelopes open under current and under previous key, and a third key lists `needs_reauth`;
- no key with a stored row lists `needs_reauth = false` (decision 11);
- no row is `NotConnected` with zero provider calls;
- a mint persists a rotated refresh token sealed and never the access token;
- a second call is served from cache (one token request);
- after disconnect the cached token is refused;
- after a reconnect the cache misses;
- a refresh that completes after the row is deleted (mock hold) returns `NotConnected` and caches nothing;
- a reconnect landing during a rotating refresh is not overwritten and not cached;
- an expired cache entry is refreshed (clock advanced);
- revoke failure still deletes;
- a reconnect keeps `connected_at` and moves `updated_at` (clock advanced between the two saves);
- the caller's future is dropped while the mock holds a rotating refresh response; after release the rotated token is in the row (decision 13).

Concurrency, both orders, by polling `pg_locks` under a timeout as M4 Task 3 does: a transaction holding the user `for update` blocks `save`, and after the user is deleted `save` reports `UserGone` with no row; an open `save` transaction blocks `purge_and_delete`, which then removes the new row.

## Task 5: gate, connect and callback routes

**Spec source:** `gate.server.ts`, `handlers.server.ts:62-202`, `routes/api/workspace/{connect,callback}.$provider.ts`, `client.ts:63-82` (the codes the UI knows), `handlers.server.test.ts:64-240`.

- `quesar-server/src/workspace/{mod,gate,connect,callback}.rs`, mounted at `/api/workspace` in the router builder M3 left (`router_with_public`) with a JSON 404 fallback, the 405 fallback and the cookie re-issue layer; no mount-level `SameOrigin` (the navigations could not pass it). `AppState` gains `workspace: Option<Arc<WorkspaceService>>`, present only with a database. `SealingKeys` is not `Clone`: share M4's through an `Arc`, or build a second one from the same two variables.
- `gate::admit(&AppState, &AuthUser) -> Result<(&AuthServices, &WorkspaceService), ApiError>`: the `workspace` limit by user id; limiter failure is 503.
- `api::error`: add `ServiceUnavailable { code, message }` (503, `UnavailableError`) and `Upstream { code, message }` (502, `UpstreamError`) unless M3/M4 already have equivalents.
- A redirect helper: 302 to `<base_origin>/console/workspace<query>`, `Cache-Control: no-store`, optionally clearing the state cookie (`handlers.server.ts:69-76`).
- `GET /connect/{provider}`: `AuthUser`, `admit`; unknown slug redirects with `unknown_provider`; a blocker redirects with its code, with no cookie and no row; otherwise `flow::start`, 302 to the authorize URL with the state cookie.
- `GET /callback/{provider}`: `AuthUser`, `admit`; then the order of `handlers.server.ts:135-201`. Every terminal path clears the cookie.
  - Unknown slug.
  - Provider `error`: cut to 64 UTF-16 units with `text::utf16_prefix`, percent-encoded as `encodeURIComponent`; also `flow::discard` when a `state` is present.
  - `missing_code`.
  - State: `flow::consume` scoped to this user and provider, not expired, binding cookie present and matching; any failure is `invalid_state` with a `warn` that carries no value.
  - Blocker re-check.
  - In one spawned task (decision 13): `exchange_code`; no refresh token is `no_refresh_token`; `fetch_account_email`; one transaction with `save`. `UserGone` and any other failure are `connection_failed`, and `UserGone` first revokes the new grant (decision 14); a key failure is `encryption_not_configured`.
  - `?connected=<provider>`.

Tests (axum `oneshot`, DB, mock):
- the five `startConnect` cases of `handlers.server.test.ts:64-113`, with the `Location` checked against the mock authorize URL, PKCE and state present, and the cookie attributes exact;
- callback success stores a sealed row for the session's user, with the verifier and the exact redirect URI sent, the access token nowhere in the database, and `?connected=google`;
- `invalid_state` for no cookie, a wrong cookie, no `state`, an unknown `state`, an expired flow, a Google callback carrying a Microsoft flow's state, and **a flow started by user A presented under user B's session with A's cookie**; in each the token endpoint receives zero requests;
- a replayed callback is `invalid_state`;
- `error=access_denied` and a 300-character `error` with non-ASCII text (cut, encoded, flow gone);
- `no_refresh_token` stores nothing;
- a token-endpoint 400 gives `connection_failed`, with the code and secret absent from captured logs (own test binary, global subscriber, as `auth_oauth_logging.rs`);
- key removed between connect and callback;
- the user deleted between exchange and save leaves no row, and the mock's revoke endpoint receives the new refresh token once (Google);
- the request future dropped while the mock holds the token response: after release the row exists;
- signed out is 401 with no flow row;
- auth disabled is 401;
- no database is 503;
- the 61st request in a window is 429 with `Retry-After` and no provider call (injected clock);
- a scripted cross-site GET (`Sec-Fetch-Site: cross-site`, `Sec-Fetch-Mode: cors`) is 403, while a cross-site top-level navigation to the callback is accepted;
- `Host: evil.example` does not change the `Location` origin or the redirect URI.

## Task 6: connections, disconnect and the two listings

**Spec source:** `handlers.server.ts:204-352`, `routes/api/workspace/{connections,disconnect.$provider,drive,sharepoint}.ts`, `handlers.server.test.ts:241-369`.

- `GET /connections`: both providers in the order of `oauth.server.ts:29`, each row built as `handlers.server.ts:234-248`; a store failure is 503 `CONNECTIONS_UNAVAILABLE`. This is how the UI learns that Connect is disabled (`configured: false` plus `reason`).
- `POST /disconnect/{provider}`: `SameOrigin`, `AuthUser`, `admit`; unknown slug is 400 `ValidationError` `UNKNOWN_PROVIDER`; `revoke_and_delete`; failure is 503 `DISCONNECT_FAILED`.
- `GET /drive`, `GET /sharepoint`: `days` parsed by `requested_days` (JavaScript `parseInt` prefix semantics, the fallback and clamp of `handlers.server.ts:289-294`; vectors from Task 1). Blocker first (`connected: false`, no provider call); then `access_token` and the listing under one `listing_deadline` wait (decision 13: the mint is detached, so the deadline abandons the wait, never the write-back). `NotConnected` and `Reauth` are 200 with their reasons (`handlers.server.ts:326-339`); everything else, the deadline included, is 502 `SOURCE_UNAVAILABLE`, logged as provider and status only.

Tests:
- the `listConnections` case of `handlers.server.test.ts:242-270`;
- a connected user sees `connected`, `stored`, `accountEmail`, `scope` and `connectedAt` in JavaScript `toISOString` form (`tokens.server.ts:110-114`; the formatter of `window_start_iso`), while a second user sees nothing of it;
- the rotation scenario of lines 311-369 end to end (`reauth_required` in the list and in the listing with zero provider calls; disconnect answers `removed: true, revoked: false` with zero provider calls and the row gone);
- disconnect with a live token calls revoke once and reports `revoked: true`; a failing revoke still removes; a second disconnect answers `removed: false`;
- disconnect without `Origin`/`Sec-Fetch-Site` and with a foreign `Origin` is 403 with the row intact; `GET /disconnect/google` is 405;
- listings: unconfigured, not connected, connected with mapped rows only (no provider field outside `WorkspaceFile` in the body, no token anywhere in it), provider 500 gives 502, a held response past a 50 ms `listing_deadline` gives 502 (a deadline against a held mock response, released at the end of the test; not a sleep), a refresh rejected with 400 gives 502;
- `private, no-store` on every 200;
- signed out 401, auth disabled 401, no database 503 and 429 for each of the four routes.

## Task 7: the real revoker and the purge check

**Spec source:** `account-deletion.server.ts:28-47`, `tokens.server.ts:187-209`; `quesar-auth/src/deletion.rs` (`WorkspaceRevoker`, `purge_and_delete`); task-11-report.md with both fix reports; progress.md "Task 11: minor (deferred -> M5)".

- `quesar-services/src/workspace/revoker.rs`: `impl WorkspaceRevoker for WorkspaceService`. `available()` keeps the default `true`. `revoke(user_id, provider)` is the revoke half only: parse the provider, read credentials, open the stored token, call `revoke_grant`; any failure (unknown provider, no credentials, no key, token does not open, provider refusal) is `false` with a `warn` naming the provider only. It never deletes: the purge does.
- `purge_and_delete` (`quesar-auth`; the commerce hook runs once, before the first round, as today):
  - Before revoking, read `provider, sealed` for the user instead of `provider`.
  - Inside the transaction, after the user `for update`, replace the connection delete with `delete from workspace_connections where user_id = $1 returning provider, sealed`.
  - If any returned pair is not one of the pairs read before the revocations, roll back and start again from the read, at most three rounds. A later round revokes only the pairs it has not already attempted and keeps earlier outcomes, so the report and the `warn` do not turn a confirmed revocation into a failure; then fail with a new `DeletionError::WorkspaceChanged`, nothing changed. `delete.rs` maps it to 503 `DELETION_UNAVAILABLE`, no clearing cookie.
  - The unavailable-hook refusal stays as it is.
- Wiring: where `AuthServices` and `WorkspaceService` are built, set `services.deletion.workspace` to the service. `NoWorkspaceRevoker` remains the value when there is no workspace service and in M2's tests.

Tests. The purge-loop cases use a scripted revoker in `quesar-auth/tests/deletion.rs`; the real-service cases live in `quesar-services` and `quesar-server/tests/auth_delete.rs` (`quesar-auth` gains no dependency on `quesar-services`, not even a dev one).
- an account with Google and Microsoft connections deletes: one revoke request reaches the mock, both rows go, and the report shows `google: true, microsoft: false`;
- revoke answering 400 still deletes (best effort) and the captured `warn` names `google` and holds no envelope or token (own binary);
- a token sealed under a lost key deletes with zero provider calls;
- a connection inserted after the revocations is detected: a test revoker inserts a row during `revoke`, and the purge runs a second round that revokes it, with nothing deleted unrevoked and the first provider revoked once, not twice;
- a revoker that inserts every round ends in `WorkspaceChanged` with every table intact and the session still valid;
- a reconnect that replaces the envelope under the same provider triggers the second round;
- the endpoint test `a_workspace_connection_refuses_deletion_until_revocation_exists` is rewritten to expect success through the real service, and its 503 case is kept with `NoWorkspaceRevoker` injected;
- the M2 deletion suite passes unchanged otherwise.

## Task 8: route table, smoke, records

- A test that walks the API reference: each route answers only its method (405 with `Allow` otherwise); signed out 401; auth disabled 401; no database 503; an unknown `/api/workspace/x` is JSON 404, never the HTML page; no response from any route contains `access_token`, `refresh_token` or a `v1.` envelope.
- A full round trip against the mock in one test: connect, callback, connections, drive, a second drive call from cache (one token request in total), disconnect, drive answers `not_connected`.
- `scripts/smoke.sh`: signed-out `GET /api/workspace/connections` is 401; a cross-site `POST /api/workspace/disconnect/google` is 403.
- Append an M5 entry to the parent plan's progress log. List for M7: no call-site change is needed; error bodies are now the envelope. List for M9: the redirect URIs to register (`<PUBLIC_ORIGIN>/api/workspace/callback/{google,microsoft}`) and the variables `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID`/`_SECRET`/`_TENANT`, `APP_ENCRYPTION_KEY`/`_PREVIOUS`.

## API reference

M5 adds no `/api/fn` route (decision 1). All routes below need a session; all are rate limited by `workspace` per user, 60 per minute (429 `RateLimitedError`, code `RATE_LIMITED`, with `Retry-After`). Common errors, as the M2 envelope: 401 `UnauthorizedError` (no session, or auth disabled); 403 `CrossSiteRequestError`; 503 `AuthUnavailableError` (no database, or limiter failure); 405 `MethodNotAllowedError` with `Allow`; 404 `NotFoundError` for any other path below `/api/workspace`. The two navigations answer these as JSON too (Risk 1). Wire types are in `src/lib/api/generated/` from `quesar-contract::workspace`.

| Route | Request | 200 / 302 | Other errors |
| --- | --- | --- | --- |
| `GET /api/workspace/connect/{provider}` (navigation) | none | 302 to the provider with `Set-Cookie: __Host-quesar_workspace_state`; or 302 to `/console/workspace?error=unknown_provider \| provider_not_configured \| encryption_not_configured` | none |
| `GET /api/workspace/callback/{provider}` (navigation from the provider) | query `code`, `state`, or `error` | 302 to `/console/workspace?connected=<provider>` or `?error=<code>`, cookie cleared. Codes: `unknown_provider`, the provider's own `error` (64 units at most), `missing_code`, `invalid_state`, `provider_not_configured`, `encryption_not_configured`, `no_refresh_token`, `connection_failed` | none |
| `GET /api/workspace/connections` | none | `{ ok: true, providers: ProviderConnection[] }`, always Google then Microsoft. `ProviderConnection = { provider, label, configured, reason: "provider_not_configured" \| "encryption_not_configured" \| "reauth_required" \| null, connected, stored, accountEmail, scope, connectedAt }` | 503 `UnavailableError` `CONNECTIONS_UNAVAILABLE` |
| `POST /api/workspace/disconnect/{provider}` (same-origin) | no body | `{ ok: true, removed: boolean, revoked: boolean }` | 400 `ValidationError` `UNKNOWN_PROVIDER`; 503 `UnavailableError` `DISCONNECT_FAILED` |
| `GET /api/workspace/drive?days=N` | `days` optional | `{ ok: true, connected: true, files: WorkspaceFile[] }` or `{ ok: true, connected: false, reason, files: [] }` with `reason` one of `provider_not_configured`, `encryption_not_configured`, `not_connected`, `reauth_required` | 502 `UpstreamError` `SOURCE_UNAVAILABLE` |
| `GET /api/workspace/sharepoint?days=N` | as above | as above | as above |

`WorkspaceFile = { id, title, kind: "doc" | "slides" | "sheet" | "pdf" | "other", source: "google-drive" | "sharepoint", modified (ISO), sizeBytes: number | null, url, owner: string | null }`.

Account deletion (`POST /api/auth/delete-account`, M2) gains one refusal: 503 `DELETION_UNAVAILABLE` when connections keep changing during the purge. It no longer refuses a user merely for having a connection.

## Risks and open questions

1. **Connect and callback without a session answer 401 JSON on a navigation** (the TypeScript does the same, `connect.$provider.ts:14-15`, `callback.$provider.ts:13-15`). The Lax session cookie normally arrives, so this needs an expired session. Default: keep parity; M7 may ask for a redirect to sign-in instead.
2. **Rotation never re-seals** (decision 10): `APP_ENCRYPTION_KEY_PREVIOUS` cannot be retired until every user has reconnected or a rotating provider has replaced the token. Default: port as is; record it in the M9 runbook. A re-seal on read is a small follow-up if Donald wants it.
3. **A grant revoked at the provider shows as 502 "Source unavailable", not "reconnect"**: a refresh refused with `invalid_grant` is an ordinary listing failure in the TypeScript (`handlers.server.ts:340-348`). Default: port as is; note it for the M11 UX pass.
4. **Microsoft cannot be revoked** (`oauth.server.ts:338-340`). Disconnect reports `revoked: false`, and account deletion logs a warning on every Microsoft connection. Default: as the TypeScript; the UI text already says so for disconnect (`workspace-sources.tsx:169-177`).
5. **One pending flow per browser**: the binding cookie has one name for both providers, so starting any Connect in a second tab invalidates the first tab's flow (`invalid_state`), and a second start for the same provider from another device deletes the first row. Default: accept; the TypeScript's single cookie behaves the same way.
6. **Connect is a GET that writes a flow row.** A cross-site link can start a flow for a signed-in user, as in the TypeScript; it ends at the provider's consent screen for the user's own account, is rate limited, and the row expires in ten minutes. Default: accept.
7. **The 2 MiB listing cap and RFC 3339-only date parsing** are choices of this plan (decision 12; `Date.parse` accepts more formats). Default: as stated; a row with another date format is dropped, as an unparseable one already is.
8. **Access-token cache is per process**, like the TypeScript's. One binary on one VPS makes that sufficient; a second instance would mint its own tokens, which is correct but not shared.
9. **The migration number** assumes M3 and M4 add none (both plans say so). Default: use the next free number and say so in the report.
10. **M3/M4 surface.** This plan names `api::error`, `text::utf16_prefix`, `user_lock::share`, `crypto::digest`, `SignedInServices.sealing` and the purge's `for update` from those plans. Default: Task 1 checks each against the code and creates only what is missing, reporting it; if the purge lock is missing, Task 4 adds it before its concurrency tests.
11. **Real-provider checks cannot run in tests.** Before go-live, one real connect, listing and disconnect per provider on staging must confirm that Google returns a refresh token with the `access_type`/`prompt` parameters, and that Microsoft's rotating refresh token is written back.
12. **`WorkspaceChanged` refuses after the commerce hook has run.** Harmless today (the M2 guard has no side effect). M6 Task 7 makes that hook write an irreversible tombstone and moves only the availability refusal ahead of it, so after M6 a three-round failure leaves the account fenced but not deleted, the same state M6 already accepts for a database fault after the unlink (a retry succeeds). Default: accept; M6 Task 7 adds this case to its tests. Owner decision if a fenced account after a refused deletion is not acceptable.
13. **Decision 14 revokes a grant the TypeScript would have stored** (only when the account was deleted mid-callback). Default: as decided; it needs the owner's nod because it is a provider-side action the Node server never takes.
14. **Fractional or above-2^53 `size` values** pass `bytes()` as JavaScript numbers (`remote.server.ts:30-37`). Default: `sizeBytes` is an `f64`-backed JSON number for non-negative finite input and `null` otherwise; a digit string too long for `u64` is parsed as `f64`, as `parseInt` does.
