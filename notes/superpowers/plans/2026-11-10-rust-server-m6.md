# Rust server M6: commerce

Parent plan: `notes/superpowers/plans/2026-11-10-rust-server-and-site-improvements.md` (milestone M6; see "Reused contracts, ported exactly" and "Decisions left with Donald", WDBX test rule). M6 ports manual-invoice commerce: the four signed-in functions of `src/lib/commerce.ts`, the invoice repository of `src/lib/server/commerce.server.ts` and the WDBX adapter of `src/lib/server/commerce-wdbx.server.ts`, which keeps spawning the native `wdbx` binary with the same typed protocol. It also replaces M2's refusing `WdbxConfigGuard` with a real account unlink for deletion. This plan assumes M3 and M4 landed as planned: `quesar-contract` (`ServerFunction`, the ts-rs export and drift test), `FnRouter` at `/api/fn` with the mount-level `SameOrigin` layer, `api::body::read`, `api::functions::admit`, `SignedInServices`, `quesar_services::text::{js_trim, utf16_len}`, `quesar_services::commerce::readiness` with `COMMERCE_FUNCTIONS_AVAILABLE = false`, and `commerce.getCommerceReadiness` (M3 Task 3, so M6 does not port it again). The frontend does not change (M7), and the Node server stays the parity oracle until M8.

## Global Constraints

- **The TypeScript file named in each task is the behavioural spec.** Port its behaviour, formats, constants, retry counts and error cases exactly. Where this plan and the TypeScript disagree on a value, the TypeScript wins; say so in the report. Where this plan deliberately departs (listed under "Decisions"), follow the plan and cite the item.
- Work only under `server/`, `scripts/`, `package.json`, `.gitignore` and the files a task names. Do not change `app/`, `docs/`, existing `migrations/*.sql` or any existing file under `src/`. The only additions under `src/` are `src/lib/server/commerce-contract.test.ts` (Task 1) and regenerated `src/lib/api/generated/*`. **M6 adds no migration**: money has one authority, the WDBX ledgers (`notes/commerce/manual-invoicing.md`, "no SQL finance mirror or commerce migration").
- Rust: edition 2024, `unsafe` forbidden, `cargo fmt` clean, `cargo clippy --all-targets -- -D warnings` clean. No `unwrap`/`expect`/`panic!` outside tests and `main`'s startup path. Errors are typed enums implementing `std::error::Error`.
- `sqlx` 0.8, runtime-checked queries only. Tests that need Postgres use `quesar_db::test_support::TestDatabase` and **fail** without `TEST_DATABASE_URL`. Store and repository tests need no database and must not require one.
- `bun run check:server` passes at the end of every task; `bun run test` stays green apart from the known `commerce.server.test.ts` failure (no `WDBX_TEST_BINARY` in cloud sessions). Commit `server/Cargo.lock` when dependencies change. One writer at a time; conventional commits ending with the dispatch's two trailer lines.

Commerce-specific additions:

- **No shell, ever.** The binary runs through `tokio::process::Command` with an argument vector; no argument is built by string concatenation, and stdin is `Stdio::null()`.
- **Never in logs, errors or `Debug`:** the host key path's contents, sealed envelopes, decrypted invoice state, payment references, user ids inside invoice state, `auth.json`/`transaction.json` bodies. User-visible messages never contain the binary, config, key or directory paths (`commerce-wdbx.server.ts:299`).
- **Unix only.** Modes and `lstat` semantics need `std::os::unix`. The store module is `#[cfg(unix)]`; on other targets `WdbxOptions::from_lookup` returns `None`, so commerce reports unconfigured.
- **A held lock must survive a dropped request.** axum drops a handler future when the client disconnects; Node does not. Every repository operation runs inside `tokio::spawn` and the handler awaits the `JoinHandle`, so a disconnect cannot abandon a `mkdir` lock. Lock and temporary-directory guards also remove their directory in `Drop` (synchronous `std::fs`), as a backstop for a task cancelled at shutdown.
- **No sleeps in tests.** The two back-offs (`commerce-wdbx.server.ts:92,296`) go through an injected `Pause` (production: `tokio::time::sleep`; tests: a recorder that returns at once and lets the test assert the requested delays). Tests that make several tasks contend for a real child process use the production pause: that wait is the code under test, not a test sleep. The command timeout is a field of the store, so the timeout test sets it short. Invoice timestamps come from the injected `Clock`.
- **Outbound calls:** none. The only external effect is the child process, and in tests it is the fake binary of Task 2 or, opt-in, the real one (Task 8). Never use `tokio::time::pause` in a test that waits on a child: auto-advance would fire the timeout.
- Every function runs behind the mount-level `SameOrigin` layer, then `AuthUser`, then `admit` (`Bucket::AuthGeneral` by `auth.user.id`), then reads its body. Every repository call takes `auth.user.id`; no handler reads a user id from the body.

## Decisions and where the code contradicts the brief

1. **Where the code lives: `quesar_services::commerce`, not a new crate.** The parent plan's crate table puts commerce in `quesar-services`, M3 Task 3 already creates `commerce::readiness` there, and M4 Task 1 makes `quesar-services` depend on `quesar-auth`, which the unlink hook (`quesar_auth::deletion::CommerceUnlinker`) and the clock need. A separate crate would only add a third home for the same options parser. Modules: `commerce/{mod,options,host_config,lock,cli,store,invoice,repository,unlink}.rs`.
2. **The fake binary is a library plus one `[[example]]` per consuming package**, not a `[[bin]]`. `CARGO_BIN_EXE_*` exists only for a package's own bins, and a `[[bin]]` in `quesar-services` or `quesar-server` would be built into `target/release` beside the real server. Examples are built by `cargo test` and never by `cargo build --release`. Tests find theirs as `<current_exe>/../../examples/<name>`; a missing file fails the test with the build command. See risk 1 for the fallback.
3. **The for-share ruling (M2 Task 11) does not apply here, and M6 adds no purge lock.** It governs SQL tables without a foreign key to `"user"`. Commerce writes no SQL row. Its equivalent already exists in the TypeScript and is ported: the per-account `mkdir` lock plus the durable `account-deleted` tombstone (`commerce-wdbx.server.ts:69-76,105-126`; `commerce.server.ts:93-94,173-175,200-201`), with the concurrency test of `commerce.server.test.ts:149-155`. The purge's `for update` was added by M3 Task 5.
4. **Rate-limit order.** The brief says "rate limited before doing work". `createPilotOrder` checks configuration first and only then hits `commerce-create` (`commerce.ts:10-15`), and the other three functions have no limit at all. Rust: `auth-general` first on all four (M4 decision 2), then for create the TypeScript order: validate, configuration, `Bucket::CommerceCreate` by user id, repository. An unconfigured server therefore burns no invoice quota. A refusal is 429 `RateLimitedError`, not the TypeScript's HTTP 500 with "Too many invoice requests. Try again later.".
5. **Errors are typed and enveloped; the TypeScript throws bare `Error`s.** Every refusal in `commerce.server.ts` is `throw new Error(...)`, which the dispatcher sends as HTTP 500 named `Error`. Nothing in `src/` matches on those names or messages: the only caller, `src/components/site/engineering-engagements.tsx:49-56`, shows one fixed sentence for any failure, and `listCommerceOrders`, `cancelCommerceOrder` and `adminSettleCommerceOrder` have no caller at all. Rust keeps each message and gives it a code and status (API reference). This differs from M4's in-band `{ ok: false, reason }` results on purpose: M4 mirrored result unions the TypeScript returns; commerce returns none. No commerce-specific error name is invented: 503s reuse M5 Task 5's `ApiError::ServiceUnavailable { code, message }` (`UnavailableError`; create it here if M5 did not), and M6 adds two generic variants of the same shape, `Forbidden` (403 `ForbiddenError`) and `Conflict` (409 `ConflictError`). M7 matches on `code`.
6. **Raw failures leak paths in the TypeScript.** A failed `inspect` with empty stderr (timeout, missing binary, oversize output, bad JSON) is rethrown as is (`commerce-wdbx.server.ts:293`), and `execFile`'s message contains the full command line, contradicting the comment at `:299`. Rust maps all of them to the fixed "WDBX invoice ledger unavailable; operator review required." and logs the cause server-side.
7. **Readiness does not require `BETTER_AUTH_SECRET`** (`commerce.server.ts:57,241`), following M3 decision 7. "Persistent authentication" in Rust means a database (the `AuthServices` exists) and a valid public origin.
8. **The brief's "0700/0600 modes and private-directory checks".** The TypeScript checks only directories (`privateDirectory`, `:57-61`: the store root, `.account-locks`, `.account-ledgers`, each invoice directory) and creates files `0600`. It never inspects the mode of the config or host-key file; `manual-invoicing.md` says the native CLI does. Rust ports exactly that (risk 6).
9. **`unlinkAccount` under-counts after a lost acknowledgement.** On a retry the callback sees its own committed change, finds nothing left to unlink and returns `false` (`commerce.server.ts:204-211`). The count is informational only; port as is and do not "fix" it.
10. **List order.** `list` sorts by `createdAt` only (`:142`); ties keep `readdir` order. Rust sorts by `createdAt` descending, then `id`, so tests are deterministic.
11. **Idempotency keys are hashed as sent.** `identity` hashes the key string without normalising it (`:47-52`), so the same UUID in another letter case is a different invoice. Rust validates the key as a string and hashes those exact bytes; it never round-trips through a UUID type.
12. **Deleting a commerce-configured account without `APP_ENCRYPTION_KEY`.** `unlinkCommerceAccount` does not call `requireDurableCommerce` (`:249-258`): it succeeds when there are no invoices (the tombstone is plaintext) and fails on the first sealed invoice. Port as is; the failure aborts deletion.
13. **The admin decision runs twice on a settle.** The TypeScript checks it only inside `settle`, after input validation and `requireDurableCommerce` (`commerce.ts:33-37`, `commerce.server.ts:165-172`). M4 Task 8's rule for admin functions is "right after `admit`, before the body is read", so the Rust handler does that first (a non-admin gets 403 whatever the body or the configuration) and the repository checks again where the TypeScript does, so no caller of `settle` can skip it. Neither result is cached.
14. **Identifiers zod accepts and the store refuses.** `z.uuid()` accepts upper-case hex (`regexes.js:25-29`); `update` requires lower case (`commerce-wdbx.server.ts:174`), so an upper-case `orderId` is "Invalid invoice identifier." in the TypeScript. Rust never lower-cases it and answers the same 409 `INVOICE_UNAVAILABLE` as a missing invoice: such an id can name no ledger. An upper-case `idempotencyKey` is valid and hashed as sent (decision 11).
15. **The repository is built with the database, not inside `SignedInServices`** (which M4 builds without one): its production `AdminCheck` holds the pool. `AppState.commerce: Option<Arc<CommerceRepository>>`, built as M5 builds `AppState.workspace`, from the same `SealingKeys`; `None` without a database or without complete WDBX options. It exists even when no encryption key is set, because deletion needs it (decision 12).

## Task 1: contract types and vectors generated from the TypeScript

**Spec source:** `src/lib/commerce.ts` (inputs, `:8,25,32-34`); `src/lib/server/commerce.server.ts:7-52` (`orderSchema`, `stateSchema`, `identity`), `:90-230` (transitions); `src/lib/server/commerce.server.test.ts:17-19` (the admin mock); `src/lib/server/crypto-contract.test.ts` (generator pattern, `GEN_CONTRACT_VECTORS=1`); `node_modules/zod/v4/core/regexes.js:25` (`uuid`).

- `quesar-contract/src/commerce.rs` (extend M3's file): `CommerceOrder` (field names and literal types of `orderSchema`; `amountMinor` a number; `paidAt` nullable, never omitted), `CreatePilotOrderInput { idempotencyKey }`, `CancelCommerceOrderInput { orderId }`, `AdminSettleCommerceOrderInput { orderId, paymentReference }`, all `deny_unknown_fields` (the zod objects are `.strict()`). Four `ServerFunction` units: `commerce.createPilotOrder`, `commerce.listCommerceOrders` (`NoInput`, output `Vec<CommerceOrder>`), `commerce.cancelCommerceOrder`, `commerce.adminSettleCommerceOrder`. Export the types and regenerate `src/lib/api/generated/`, but do **not** add the four units to `FUNCTIONS` yet: M3 Task 8's route-table test requires every `FUNCTIONS` name to be mounted, and the routes arrive in Task 6, which registers them.
- `src/lib/server/commerce-contract.test.ts` (new) writes `server/contract/commerce.json` when `GEN_CONTRACT_VECTORS=1` and otherwise checks the committed file. `identity` and `stateSchema` are not exported, so drive the public `CommerceRepository` over an in-memory object with the four store methods it calls (`update`, `withAccountLock`, `accountDeleted`, `ids`), cast to `WdbxCommerceStore`; mock `./admin.server` as the existing test does; fix `APP_ENCRYPTION_KEY` with `vi.stubEnv` and the time with `vi.setSystemTime`. No binary is needed. Vector groups:
  - `identity`: `(userId, idempotencyKey) -> { id, invoiceNumber }`, including a user id with a quote, a backslash, a control character and non-ASCII text, and one key in upper case.
  - `scenarios`: an ordered list of operations (create, repeat create, cancel, repeat cancel, settle, repeat settle with the same and with another reference, settle a cancelled invoice, cancel a paid one, another buyer's cancel, unlink buyer, unlink admin, create after unlink), and after each the returned order or the thrown message, plus the decrypted state as the exact `JSON.stringify` string.
  - `sealed`: envelopes sealed by the TypeScript with the test key and associated data `commerce:<id>`, for Rust to open and parse.
  - `inputs`: accept and reject lists for `z.uuid()` and for the payment reference (zod's `.trim().min(3).max(160)` followed by `settle`'s own check, `:165-171`), restated in the generator from `commerce.ts:8,25,33`. Include an upper-case UUID, the nil and all-`f` UUIDs, a version-0 and a variant-`c` UUID, a reference that is 3 units only before trimming, one of 160 and 161 UTF-16 units with an astral character, and one holding U+007F.
- In normal mode the test regenerates nothing and compares the committed file's `identity`, `inputs` and `scenarios` with a fresh run (the fixed key and time make them reproducible; `sealed` envelopes carry a random IV, so those are opened, not compared).

Tests (Rust, `quesar-contract`): JSON round trips of an order in each status against literals from the vectors; unknown input keys are refused; the drift test passes.

## Task 2: the fake `wdbx` test-support crate

**Spec source:** `commerce-wdbx.server.ts:8-42` (the three schemas), `:139-146,233-277` (argument order and the two JSON files); `commerce.server.test.ts:26-30,41-52,122-136` (journal layout, the synthetic config, the acknowledgement-loss shim); `notes/commerce/manual-invoicing.md` (value cap 64 KiB, 16 mutations, one journal file per commit, HMAC under the host key).

Create `server/crates/quesar-wdbx-fake` (library only; `serde`, `serde_json`, `sha2`, `hmac`, `hex`): `pub fn run(args: &[OsString], stdout: &mut dyn Write, stderr: &mut dyn Write) -> u8`. The crate doc says in its first line that it is a test double and no evidence about the native binary.

- `typed inspect <dir> <config> <hostKey>`: parse the config as `wdbx-typed-host-config-v1`, require a 32-byte key file, replay `<dir>/journals/*` in name order verifying each record's HMAC, and print `wdbx-typed-inspection-v1`: `namespace` and `writer_id` as lower-case hex, `frontier` empty for an empty ledger, `rows` holding at most the eight newest versions with `current` on the newest and one `conflict_ids` entry. An empty directory is a valid empty ledger (the adapter inspects a directory it has just created, `:192,216`).
- `typed commit <dir> <config> <hostKey> <auth.json> <transaction.json>`: take an exclusive non-blocking lock on `<dir>/.writer` (`File::try_lock`; held: exit 1, stderr containing `WriterBusy`). Then refuse, with a distinct stderr word and no write, when: the authorization is not `allowed` and `writer_allowed`, or its principal, role, namespace, policy or consent differ from the config; `writer` is not the granted writer; `sequence` is not frontier + 1; `observed` is not the current frontier; the nonce is not 32 bytes; there are more than 16 mutations or a value over 64 KiB. Otherwise write `journals/<sequence, zero-padded>.json` with `create_new`, `sync_all` the file and directory, exit 0. The journal stores the value as given, which is the sealed envelope.
- Fault plan, read from `<config>.faults.json` beside the config file, so each test's temporary directory carries its own plan and no process environment is touched (`std::env::set_var` is `unsafe` in edition 2024). Each entry names a command, a fault and a count; the fake holds an exclusive `File::lock` on the plan file while it reads, decrements and rewrites it (invocations for different invoices run concurrently, so the per-ledger `.writer` lock does not cover it). Every invocation also appends its argument vector to `<config>.calls.jsonl` under the same lock, which is how tests assert "the binary was not called". Faults: `ack_loss` (commit durably, then exit 1 with empty stderr, as the shim at `commerce.server.test.ts:127`), `fail_before` (exit 1 with stderr, nothing written), `busy`, `would_block` (stderr `WouldBlock`), `hang` (create `<config>.hanging`, then block until `<config>.release` exists; forever if it never does), `flood_stdout` (more than 8 MiB), `garbage_stdout`, `fail_silent` (exit 1, empty stderr), `two_current_rows`, `wrong_key`, `foreign_writer`, `wrong_namespace`, and `interleave` (before checking a commit, first append a competing version at frontier + 1 with a given value, so the caller's sequence is stale).
- `pub fn example_path(name: &str) -> PathBuf` for tests, and `pub fn write_host_files(base) -> (config, host_key)` producing the synthetic config of `commerce.server.test.ts:41-52` at mode `0600`.
- `quesar-services/examples/fake_wdbx_services.rs` (three lines calling `run`), with the dev-dependency. `cargo test -p quesar-services` builds it; `cargo test --test <name>` alone does not, so the missing-file message names `cargo build -p quesar-services --examples`.

Tests (in the fake's own crate, calling `run`): inspect of an empty ledger; commit then inspect returns the value and sequence 1; a stale sequence, a wrong observed frontier, a foreign writer and a tampered journal byte are each refused without writing; two commits racing for one sequence leave exactly one journal file; each fault does what it says exactly `count` times.

## Task 3: options, host configuration, private directories, locks and the command runner

**Spec source:** `commerce-wdbx.server.ts:8-28` (config schema), `:43-61` (`wdbxOptions`, `privateDirectory`), `:69-104` (`withAccountLock`, `withLock`), `:127-146` (`configuration`, `inspect`), `:265-277` (commit invocation).

- `options.rs`: `WdbxOptions { binary, directory, config, host_key }` and `WdbxOptions::from_lookup`, returning `Some` only when all four of `WDBX_BINARY`, `WDBX_COMMERCE_DIRECTORY`, `WDBX_COMMERCE_CONFIG`, `WDBX_COMMERCE_HOST_KEY` are non-empty absolute paths, read untrimmed as `quesar_auth::deletion::WdbxConfigGuard` does; plus `partially_configured()` (`commerce.server.ts:253`: any variable whose name starts with `WDBX_COMMERCE_` and has a non-empty value, not only the three known ones). M3's `readiness` switches to this parser so there is one.
- `host_config.rs`: serde types for `wdbx-typed-host-config-v1` with `deny_unknown_fields` at every level, fixed-length byte arrays (32, 32, 32, 32 and 16), `role` only `"service"`, exactly one grant per epoch, integer bounds within the JavaScript safe range. `load(path)` re-reads the file on every operation (as `configuration()` does) and refuses when any history grant differs from the current one ("Commerce requires one stable WDBX host writer.").
- `lock.rs`: `private_directory(path)` (`lstat`; must be a directory, not a symlink, with no group or other bits); `DirLock::acquire(path, &dyn Pause)`: `mkdir` at mode `0700`, on "already exists" pause 20 ms and retry, 50 attempts, any other error fatal, then `Busy`; release by `rmdir`, with the `Drop` backstop. `account_lock_path(root, user_id)` = `.account-locks/<sha256 hex of the user id>`, creating `.account-locks` at `0700` and checking it private.
- `cli.rs`: `WdbxCli { options, timeout: Duration }` (default the TypeScript's, `:143,276`) with `inspect(dir)` and `commit(dir, auth, transaction)`. Each spawns with `kill_on_drop(true)`, reads stdout and stderr concurrently under the TypeScript's two caps (`:143` for inspect, `:276` for commit; one byte over is a failure and the child is killed), and enforces the timeout by killing and reaping. Result: `Ok(stdout)` only for exit status 0; otherwise `CliFailure { stderr: String, kind: Exit | Timeout | Spawn | Oversize | Malformed }` (`Malformed`: exit 0 with output that is not the expected JSON) whose `Debug` shows the kind and stderr length only. `stderr` is what was read before the failure, for every kind, because the retry rule reads it. `inspect` parses `wdbx-typed-inspection-v1` leniently (unknown keys ignored, as the zod object is not strict), requiring the schema literal and non-negative safe-integer sequences.

Tests (no database; fake binary; a `0700` temporary root):
- Options: each variable missing, empty, relative; all four absolute; `partially_configured` for one `WDBX_COMMERCE_*` variable and not for `WDBX_BINARY` alone.
- Config: the synthetic config loads; an extra key at each level, a 31-byte namespace, a byte of 256, two grants, role `"admin"`, a fractional bound and a history epoch with another writer are each refused.
- Directories: mode `0750`, `0707`, a symlink to a private directory and a regular file are refused.
- Locks: a held lock yields `Busy` after exactly 50 recorded pauses of 20 ms; two tasks contending both succeed in turn (production pause); dropping the guard's future mid-hold removes the directory; an `EACCES` parent is an error, not `Busy`.
- Runner: a missing binary, a non-executable file, `hang` (with a 150 ms timeout: the call returns `Timeout` and no child remains), `flood_stdout`, `garbage_stdout` and a wrong schema literal each give the right kind; the argument vector is exactly the TypeScript's (assert through the fake's recorded argv); a directory name containing a space, a quote and `$(...)` reaches the fake as one argument.

## Task 4: the store: `update`, discovery and the account tombstone

**Spec source:** `commerce-wdbx.server.ts:105-126` (`accountDeleted`), `:147-168` (`ids`), `:169-304` (`update`, whole function).

`store.rs`: `WdbxCommerceStore::new(options, capacity: Option<usize>, pause, timeout)`; the default capacity is the TypeScript's (`:67`).

- `ids()`: load the config, read the root; a name matching the lower-case UUID pattern (`:153`) that is not a real directory is "Invalid WDBX invoice directory."; more matching directories than the capacity is "Commerce invoice discovery capacity exceeded; operator review required.". Dot-directories never match.
- `update(id, f, create)` where `f: FnMut(Option<&str>) -> Result<Change<T>, E>` and `Change` is `Keep(T)` or `Put(String, T)`:
  1. Refuse an id that does not match the pattern. Load the config.
  2. `create`: under `.creation-lock` in this store's root, `lstat` the invoice directory; if absent, refuse at capacity ("Commerce invoice capacity reached; contact sales.") and otherwise `mkdir` it `0700`. Not `create` and absent: return `f(None)`'s result without touching the disk (`:205`).
  3. Check the invoice directory is private.
  4. Up to 8 attempts (`:213`): inspect; refuse a namespace other than the config's hex or any frontier writer other than the granted one; refuse more than one current row, or a current row whose `conflict_ids` is not exactly one or whose key is not `invoice`; call `f` with the current value. `Keep`: return. `Put` over 8192 bytes: "WDBX invoice payload capacity exceeded.". Otherwise make a `0700` `.request-<random>` directory in the root, write `auth.json` and `transaction.json` at `0600` with exactly the fields of `:235-259` (sequence = first frontier entry + 1, or 1; a fresh 32-byte OS-random nonce per attempt; `observed` from the frontier), run commit, and remove the directory on every path.
  5. Retry rule (`:282-297`): a failure **before** commit is retried only when the child's stderr matches `WriterBusy` or `WouldBlock`; any other inspect failure is `LedgerUnavailable` (decision 6); an error from `f` is returned unchanged. **Any** failure at the commit stage is retried from inspect, so `f` runs again on the fresh value and must recognise its own committed work. A pause of 20 ms × n follows the n-th retryable failure, the eighth included (`:296` runs before the loop condition). After 8 attempts: `Unconfirmed` ("WDBX invoice operation could not be confirmed; retry the same request identifier.").
- `account_deleted(user_id, mark)`: a second store rooted at `.account-ledgers` (created `0700`, checked private) with no capacity; id = the UUID-shaped slice of `sha256(JSON.stringify(["quesar-commerce-account-v1", userId]))` (`:110-113`, serialised with `serde_json` on a two-string array); the value is the literal `account-deleted`, any other stored value is "WDBX account deletion fence is invalid."; `create = mark`. `with_account_lock(user_id, future)`.

Tests (fake binary; the recording pause unless noted):
- First write creates the directory `0700` and one journal; a second `Put` commits sequence 2; `Keep` and an unchanged value spawn no commit.
- `ack_loss` once: `update` succeeds, `f` ran twice, exactly one journal file, pauses `[20]`.
- `interleave` once: the first commit is refused as stale, `f` sees the competing value on the retry.
- `busy` three times on inspect succeeds on the fourth attempt with pauses `[20, 40, 60]`; separately, `would_block` once on commit is retried with pauses `[20]`.
- Eight `fail_before` commits give `Unconfirmed` after pauses 20 to 160, with no `.request-*` directory left.
- `fail_silent` and stderr-only inspect failures give `LedgerUnavailable` at once.
- `two_current_rows`, `wrong_key`, `foreign_writer`, `wrong_namespace` each refuse without calling commit.
- A 8193-byte value is refused before any commit; 8192 is accepted.
- Request files: the fake copies its two inputs aside; assert the JSON keys, the sequence, a 32-byte nonce differing between attempts, and modes `0600`/`0700`.
- Discovery: a symlink and a file named like a UUID are refused (`commerce.server.test.ts:141-147`); 1,000 directories list; 1,001 exceed; creation number 1,001 is refused before any directory appears while `ids()` still answers (`:156-173`).
- A missing invoice with `create = false` creates nothing (`:137-140`).
- Tombstone: unmarked reads false, spawns nothing and creates only the `.account-ledgers` directory itself (`:107`), no ledger; marked reads true from a new store instance; a foreign value in the fence ledger is refused; tombstones do not count toward capacity.
- An upper-case id and `../x` are refused before any filesystem call.

## Task 5: invoice state, the repository and the ported scenario suite

**Spec source:** `commerce.server.ts:7-231` in full; `commerce.server.test.ts:70-176`; `server/contract/commerce.json`.

- `invoice.rs`: `InvoiceState` and `InvoiceEvent` with serde reproducing `stateSchema`: `deny_unknown_fields` on state and order (events tolerate unknown keys, as the zod object is not strict), field order as the schema, at most 4 events, the paid/unpaid invariant of the `.refine` (`:40-44`), timestamps in `toISOString` form. `quesar-server`'s `auth::view::iso` is not reachable from this crate: use a formatter M4 left in `quesar-services` if there is one, otherwise a private one with the format description of `view.rs:11-12`; the vectors pin it. `InvoiceId::derive(user_id, key)` (`:47-52`). The constants of `:104-115` come from the vectors, not from retyping.
- `repository.rs`: `CommerceRepository { store, sealing: SealingKeys, clock, admin: Arc<dyn AdminCheck> }`. `mutate` opens with associated data `commerce:<id>`, parses strictly, refuses a state whose `order.id` differs from the ledger id ("Invoice identity mismatch."), and seals a changed state with the same associated data. `create`, `list`, `cancel`, `settle` and `unlink_account` follow `:90-230` step for step, including: the account lock and tombstone check around create and settle; settle validating the reference, then asking `AdminCheck` (production: `quesar_auth::admin::admin_decision_for` on every call), then locking; the idempotent repeats; `deleted-account` replacing a deleted settler. `AdminCheck` is a trait (`fn is_admin<'a>(&'a self, user_id: &'a str) -> BoxFuture<'a, Result<bool, CommerceError>>`) so repository tests need no database, as the TypeScript mocks it; the production implementation holds the pool and `AdminEmails`, and an error from the decision is a failure, never admin.
- `CommerceError` with one variant per message in the API reference.
- `tests/commerce_support/scenarios.rs`: each case of `commerce.server.test.ts` as an `async fn(&Harness)`, where `Harness` holds a binary path, so Task 8 reuses them unchanged. `tests/commerce_fake.rs` runs them against the fake.
- Write `server/contract/commerce-rust.json` (Rust-sealed states, one per status and one after an unlink) under `GEN_CONTRACT_VECTORS=1`, commit it, and add the case to `commerce-contract.test.ts` that loads each into the in-memory store and reads it back through `repo.list`, asserting the order fields. This is the Rust-to-TypeScript half of the parity check.

Tests:
- Every `identity`, `scenarios`, `sealed` and `inputs` vector; Rust's serialised state equals the vector string byte for byte.
- The eight TypeScript cases: four concurrent creates share one id and server-fixed money; another buyer with the same key gets another id; the journal bytes contain neither the buyer id nor "Pilot engineering"; a fresh repository instance lists the invoice; another buyer's cancel and a non-admin settle are refused; a reference of `"\n"` is refused; two concurrent settles with different references leave exactly one success; paid cannot be cancelled and cancelled cannot be settled; unlink returns 1 then 0 and the directory remains; acknowledgement loss; create racing unlink leaves nothing listed and later creates refused.
- Added abuse cases:
  - a sealed state moved into another invoice's ledger fails to open (associated data);
  - a state sealed under the previous key opens (rotation);
  - no key: create refuses, nothing is stored in plaintext;
  - a tampered envelope fails the whole list (fail closed);
  - an idempotency key in another case is a different invoice;
  - the non-admin settle never spawns the binary;
  - a tombstoned admin cannot settle;
  - the four-event maximum (created, paid, buyer unlinked, settler unlinked) round-trips, and a fifth event is refused;
  - the order returned to a buyer never carries `userId`, `settledBy` or `paymentReference`.

## Task 6: the four `/api/fn` routes

**Spec source:** `src/lib/commerce.ts` in full; `commerce.server.ts:53-62,232-248`; `engineering-engagements.tsx:33-60`.

- `quesar-server`: `AppState.commerce` (decision 15), built from `WdbxOptions::from_lookup` over `Environment::raw_pairs`. `api/functions/commerce.rs`: a `require_durable` step with the three refusals of `requireDurableCommerce` in its order (ledger, authentication per decision 7, encryption), then the four handlers. Each: `AuthUser`, `admit`, (settle only: the admin decision, decision 13), read the body under the default cap, validate (UUIDs by the accept set the `inputs` vectors pin; the reference with `js_trim` and `utf16_len`), `require_durable`, then for create only `Bucket::CommerceCreate` by user id, then the repository call inside `tokio::spawn`. A panicked or cancelled task is `Internal`.
- `api::error`: `Forbidden` and `Conflict` (decision 5), and the `CommerceError` mapping of the API reference. Every variant is mapped; none falls through to a default arm. Integrity failures are `Internal` (logged with the invoice id and the variant, never the state, a path or the child's stderr).
- Add the four units to `quesar-contract`'s `FUNCTIONS` and regenerate `index.ts` (deferred from Task 1).
- `quesar-server/examples/fake_wdbx_server.rs` with the dev-dependency (decision 2).
- Flip `COMMERCE_FUNCTIONS_AVAILABLE` to `true` in the same commit, so readiness never says "configured" before the routes exist; update M3 Task 3's readiness test that asserts `configured: false` for a complete environment.

Tests (database, fake binary, `oneshot`):
- Signed out: 401 on all four. Cross-site: 403. `GET`: 405. `VITE_AUTH_ENABLED=false` with a valid cookie: 401 on all four while `commerce.getCommerceReadiness` still answers. No database: 503 `AuthUnavailableError`.
- Unconfigured WDBX, missing key: 503 with the matching code, and no `commerce-create` row is written.
- Create returns the order; the same key returns the same order; a body with `amountMinor`, `userId` or `product` is 400 (strict input); a non-UUID key is 400.
- The create after the bucket's maximum is 429 with `Retry-After` (injected clock); another user is unaffected.
- User B cannot cancel or see user A's invoice; the refusal for a foreign id, a random id and an upper-case copy of A's id is byte-identical (decision 14), and the last spawns nothing.
- Settle: a buyer gets 403 and the fake records no call, with a valid body, a malformed body and an unconfigured ledger alike; an allow-listed email/password user without a verified Google or Apple link gets 403; an allow-listed Google-verified user settles; after the admin's verification row is deleted the next settle is 403 (the decision is re-read every call); a `userId` or `settledBy` field in the body is 400.
- A request dropped mid-commit: start a create with `hang` on commit, wait for `<config>.hanging`, drop the `oneshot` future, write `<config>.release`, then poll under a timeout (as M4 Task 3 polls `pg_locks`) until no `.account-locks/*`, `.creation-lock` or `.request-*` remains; a second create with the same key then returns the invoice, proving the spawned task finished the commit.
- Each mapped `CommerceError` reaches the wire with its status and code and no path: drive `LEDGER_UNAVAILABLE`, `COMMERCE_UNCONFIRMED`, `COMMERCE_BUSY` (a pre-made lock directory and the recording pause), `CAPACITY_REACHED` and one `Internal` (a `0750` invoice directory) through the fake, asserting the body never contains the temporary directory's path.
- `scripts/smoke.sh`: signed-out `POST /api/fn/commerce.listCommerceOrders` is 401; cross-site is 403.

## Task 7: account deletion unlinks commerce

**Spec source:** `commerce.server.ts:199-230,249-258` (`unlinkAccount`, `unlinkCommerceAccount`); `account-deletion.server.ts:35-48`; `quesar-auth/src/deletion.rs`; `task-11-report.md` (hook contract and both fix rounds).

- `commerce/unlink.rs`: `WdbxUnlinker` implementing `CommerceUnlinker`: complete options: run `unlink_account` on the shared repository; none: `PartialConfiguration` when any `WDBX_COMMERCE_*` is set, else `Ok(0)`. In `quesar-auth/src/deletion.rs` add `CommerceUnlinkError::Failed` for a store, lock or decryption failure (cause logged by the unlinker, variant only), and correct the `Unavailable` doc comment; `delete.rs:101` already maps every `DeletionError::Commerce(_)` to 503 `DELETION_UNAVAILABLE`.
- `quesar-server`: set `services.deletion.commerce` to it. `WdbxConfigGuard` stays as the default of `DeletionHooks::defaults` for tests that build no commerce.
- In `purge_and_delete`, move the commerce hook to **after** the workspace-availability refusal and before the first provider revocation (M5 Task 7 reads `provider, sealed` first; keep that read where it is). The tombstone is irreversible, so every check that can refuse without side effects must run first. The password and freshness checks already precede the purge.
- `delete.rs`: run the `purge_and_delete` call inside `tokio::spawn` and await the handle, so a client that disconnects after the tombstone is written cannot stop the SQL purge from following it.

Tests:
- Deleting a buyer with one awaiting and one paid invoice: both ledgers remain, `list` for that id is empty, the paid invoice still reads `paid` for the admin path, the user row is gone.
- Deleting the admin who settled: the state shows `deleted-account` and null actors.
- After deletion, a create under the same user id (replayed in-process) is refused.
- Concurrency: create and deletion started together end with no invoice attributed to the user, whichever wins (`commerce.server.test.ts:149-155`, through the endpoint).
- Partial configuration, a `fail_silent` ledger and a tampered invoice each give 503 with the account, session and every row intact.
- A user with a workspace connection and no revoker is refused **without** a tombstone being written.
- A database fault after the unlink (the trigger of `tests/deletion.rs`) leaves the account whole and fenced; a second deletion succeeds (unlink is idempotent).
- The existing `auth_delete.rs` case "complete WDBX configuration refuses" (`:388-391`, paths that do not exist) stays and still expects 503 with nothing deleted, now because the store root is missing; a new case with a real temporary store and the fake expects success.
- M5's `WorkspaceChanged` failure after a successful unlink: the account survives, is fenced, and a retried deletion succeeds.

## Task 8: the real-binary suite, gate wiring and records

**Spec source:** `commerce.server.test.ts:20-22,31-33,59-63`; parent plan "Decisions left with Donald" (WDBX test rule); `notes/commerce/manual-invoicing.md` (last paragraph).

- `quesar-services/tests/commerce_wdbx_real.rs`: the Task 5 scenarios against `WDBX_TEST_BINARY`, each test `#[ignore = "run by check:wdbx"]`. Inside, a missing or non-absolute variable is a **failure** naming it, never a pass. The suite prints the binary's SHA-256. The acknowledgement-loss case wraps the real binary in a `/bin/sh` script written to the temporary directory, as the TypeScript writes a Node shim.
- `package.json`: `"check:wdbx": "cargo test --manifest-path server/Cargo.toml --locked -p quesar-services --test commerce_wdbx_real -- --ignored"`, and **option A**: `check` becomes `… && bun run check:server && bun run check:wdbx && bun run build`. The suite needs no database, so it does not go through `scripts/dev-postgres.sh`. `check:server` itself stays green without the binary; the full gate stays red in cloud sessions, exactly as vitest's `commerce.server.test.ts` already makes it. Switching to option B is deleting that one clause and adding `check:wdbx` to the release checklist.
- `scripts/smoke.sh` gains nothing further. Append the M6 entry to the parent plan's progress log: what exists, the fake's limits, the SHA-256 of any real binary a run used, and the open questions below.

Tests: with `WDBX_TEST_BINARY` unset, `bun run check:wdbx` exits non-zero with the variable's name in the output (capture it in the report); pointed at the fake example (built by a prior `check:server`), the whole suite passes, which proves the wiring but is recorded as no evidence about the native binary.

## API reference

All routes are `POST /api/fn/<name>`, same-origin, session required, bucket `auth-general` by user id; the body is the input itself. Success is `{ "ok": true, "result": R }`. Types are generated into `src/lib/api/generated/`.

`CommerceOrder` = `{ id, invoiceNumber, product: "pilot", description, currency: "USD", amountMinor: 250000, status: "awaiting_payment" | "paid" | "cancelled", createdAt, paidAt: string | null }`.

| Name | Request | Result | Notes |
| --- | --- | --- | --- |
| `commerce.createPilotOrder` | `{ idempotencyKey: uuid }` | `CommerceOrder` | also bucket `commerce-create` by user id; the same key returns the same invoice |
| `commerce.listCommerceOrders` | none | `CommerceOrder[]`, newest first | only the caller's invoices |
| `commerce.cancelCommerceOrder` | `{ orderId: uuid }` | `CommerceOrder` | repeat is idempotent |
| `commerce.adminSettleCommerceOrder` | `{ orderId: uuid, paymentReference }` (trimmed, 3-160 UTF-16 units, no control characters) | `CommerceOrder` | admin decision re-read on every call, before the body and again in the repository; same admin and reference is idempotent |
| `commerce.getCommerceReadiness` | none | `{ configured, paymentMode: "manual_invoice", storage: "wdbx" }` | public, from M3; `configured` can be `true` from M6 |

Errors, beyond those common to every function (403 `CrossSiteRequestError`, 401 `UnauthorizedError`, 503 `AuthUnavailableError`, 404, 405, 413, 429 `RateLimitedError`, 500 `InternalError`). Messages are the TypeScript's, quoted here only where one code covers several.

| Status | Name | Code | When |
| --- | --- | --- | --- |
| 400 | `ValidationError` | `INVALID_BODY` | unknown key, not a UUID |
| 400 | `ValidationError` | `INVALID_PAYMENT_REFERENCE` | the reference rule of `commerce.server.ts:165-171` |
| 403 | `ForbiddenError` | `ADMIN_REQUIRED` | settle by a non-admin, checked before the body is read |
| 409 | `ConflictError` | `INVOICE_UNAVAILABLE` | cancel or settle: missing, not the caller's, not awaiting payment, or an id no ledger can have (one answer for all) |
| 409 | `ConflictError` | `INVOICE_REQUEST_UNAVAILABLE` | create: the derived id holds another request |
| 409 | `ConflictError` | `ACCOUNT_UNAVAILABLE` | the acting account is tombstoned (buyer on create, admin on settle) |
| 503 | `UnavailableError` | `COMMERCE_NOT_CONFIGURED` | any `requireDurableCommerce` refusal, with its message |
| 503 | `UnavailableError` | `COMMERCE_BUSY` | an account or creation lock was not acquired in 50 tries |
| 503 | `UnavailableError` | `COMMERCE_UNCONFIRMED` | 8 attempts exhausted; the client retries with the same key |
| 503 | `UnavailableError` | `LEDGER_UNAVAILABLE` | the binary failed outside a commit (decision 6) |
| 503 | `UnavailableError` | `CAPACITY_REACHED` | invoice 1,001, or discovery over capacity |
| 500 | `InternalError` | `INTERNAL` | every operator-state failure, with M3's fixed message: a non-private directory, an unreadable or invalid host config, an unstable writer, "Invalid WDBX invoice directory.", namespace or writer mismatch, a ledger conflict, payload over 8192 bytes, an invalid deletion fence, an envelope that does not open or parse, "Invoice identity mismatch.", any other I/O error |

M7 notes: `createPilotOrder` keeps its retry-with-the-same-key behaviour; `COMMERCE_UNCONFIRMED` and `COMMERCE_BUSY` are the two retryable codes, and the UI's single failure sentence (`engineering-engagements.tsx:52-54`) still fits every other one. Account deletion (`POST /api/auth/delete-account`) is unchanged on the wire.

## Risks and open questions

1. **Examples as test executables.** If `cargo test` does not leave `target/<profile>/examples/<name>` where `example_path` looks (a custom `--target`, a future layout change), fall back to a `[[bin]]` in `quesar-wdbx-fake`, built by a `cargo build -p quesar-wdbx-fake` step placed before `cargo test` in `check:server`, and report it. Default: examples.
2. **WDBX test rule (Donald).** Default option A as wired in Task 8. Option B is removing `&& bun run check:wdbx` from `check` and adding it to the release checklist.
3. **The fake is not the native binary.** Its stderr words, its inspection row limit and its refusal conditions are inferred from the adapter and the notes. Default: nothing in production code depends on fake-only behaviour, and no claim about native behaviour is made until `check:wdbx` runs against a real build; record that hash in the progress log.
4. **Timeout kills with SIGKILL.** Node's `execFile` sends SIGTERM; `tokio` can only kill. Default: kill, reap, and treat a commit-stage timeout as an uncertain commit (re-inspect), as the TypeScript does.
5. **Child environment.** The TypeScript child inherits the server's environment, secrets included. Default: inherit (parity). Clearing it is safer but untestable without the real binary; decide after the first `check:wdbx` run with `env_clear()`.
6. **Config and key file modes are not checked by the server** (decision 8). Default: parity. Adding an `lstat` check is a few lines if Donald wants the server to refuse before the CLI does.
7. **`list` and `unlink` spawn one process per invoice directory**, up to 1,000, sequentially, and one unreadable invoice fails every user's list. Default: port as is; `auth-general` bounds a single user. A per-user index is new design and belongs to Donald.
8. **No stale-lock takeover.** A `SIGKILL` or power loss while a lock is held blocks that account (or, for `.creation-lock`, all creation) until an operator removes the directory. Default: keep the TypeScript rule and the 503 message; M9's runbook documents the removal.
9. **A failed deletion after the unlink leaves a live account fenced from invoicing.** Task 7 narrows the window (side-effect-free refusals first; the purge runs in a spawned task) but a database fault or M5's `WorkspaceChanged` remains possible. Default: accept, as the TypeScript does; retrying the deletion completes it. There is no way to lift a tombstone, by design.
10. **An invoice directory created just before an unconfirmed first commit stays empty and counts toward capacity.** Default: accept; retrying the same key reuses it.
11. **M3/M4/M5 names may differ from their plans** (`admit`, `SignedInServices`, `COMMERCE_FUNCTIONS_AVAILABLE`, `text::*`, `ServiceUnavailable`, the `FUNCTIONS` route-table test). None of them exists in the code today. Default: Task 1 checks the code and adapts; names here yield to what exists.
12. **zod's UUID accept set** is pinned by Task 1's `inputs` vectors; if Rust's validator and the vectors disagree, the vectors win.
13. **Error names, statuses and hidden operator messages are this plan's, not the TypeScript's** (decision 5): every commerce refusal is HTTP 500 `Error` with its sentence there. Default: the table above, M5's `UnavailableError` for 503s, and a fixed 500 for operator-state failures (their sentences hold no path, but they describe the host to any signed-in caller). If Donald prefers M4's in-band `{ ok: false, reason, message }` results, it is a change to Task 6's mapping and the contract types only.
14. **The settle handler checks the admin decision before `require_durable`** (decision 13), so on an unconfigured server a non-admin sees 403 where the TypeScript says "Invoicing requires…". Default: the stricter order.
15. **The fake's inspection shape rests on two sources that disagree**: the adapter's comment says the CLI projects eight history rows (`commerce-wdbx.server.ts:62-63`), `manual-invoicing.md` says it returns only current versions. The adapter filters on `current`, so both work. Settled only by a real-binary run (risk 3).
