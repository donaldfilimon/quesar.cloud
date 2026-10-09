# Completion correctness/security review, 2026-10-02

## Verdict and review boundary

**Request changes / production acceptance remains blocked.** This is a focused source review, not a deployment or live-provider receipt. Reviewed HEAD: `ac8c24afe618f34a7ed46ea0baed477133064c40` on the canonical checkout. Initial and intermediate `git status --short` and `git diff --stat` were empty. **The completion check subsequently exposed concurrent implementer changes; see the late-diff section below.** R1-R8 retain the baseline evidence and line numbers; their statuses are baseline statuses, not assertions that the new implementation lacks those changes. Only this review file was written by the reviewer. No source fixes, git mutations, agents, provider calls, builds or tests were launched.

Read repository guidance, the current integration/backend/provider/film verification records and production briefs; the complete Quasar engine/server/registry/events/siteFs/index implementations and their shared contracts; auth configuration/admin admission/schema and installed Better Auth linking logic; capture readiness, speech/narration and frame export transport. Selected associated tests were inspected. Historical green gates are reported evidence from other runs, not independently rerun here. The review skill was consulted; its agent-selection workflow was not followed because this task explicitly specifies the scope and forbids launching agents.

## Findings

### R1: Deletion does not cancel generation or fence pending writes

- **Severity:** High
- **File:line:** `sidecars/quasar-service/src/server.ts:115-157`, `sidecars/quasar-service/src/server.ts:319-337`; write sink `sidecars/quasar-service/src/engine.ts:64-67`, `sidecars/quasar-service/src/siteFs.ts:35-42`.
- **Description / evidence:** Jobs have no owned abort controller or job identifier. DELETE stops only the preview, removes files and then removes the registry row while generation continues. A write that has resolved its site path before deletion can subsequently recreate directories via `mkdir` and write into the deleted site. A later create can reuse its slug, allowing an old write to corrupt the replacement. Removing the registry row does not revoke tool closures or already pending filesystem operations. Merely adding a Promise timeout or abort flag around the runner will not close this race.
- **Suggestion:** Own each generation by immutable site/job identity; invalidate that identity before teardown, propagate cancellation to the actual provider request, and serialize/fence writes at their commit boundary against cancellation/deletion/replacement. Await or safely drain in-flight commits before making a slug reusable. Ensure scaffold/create-versus-delete is covered as well.
- **Regression criteria:** Pause an actual write after path resolution and before commit; delete/cancel and create a replacement with the same slug; release the old operation. Neither the deleted directory nor replacement changes, no late events/finalization reach a new job, and cancellation settles within a documented bound. Repeat during scaffolding, streaming and tool execution.
- **Status:** Open, confirmed source gap; race inferred from the explicit await boundaries, not dynamically reproduced in this pass.

### R2: Unbounded runner and truncated responses have dishonest terminal semantics

- **Severity:** High
- **File:line:** `sidecars/quasar-service/src/engine.ts:13-21`, `sidecars/quasar-service/src/engine.ts:95-110`; `sidecars/quasar-service/src/server.ts:140-148`.
- **Description / evidence:** No total generation deadline or iteration limit is supplied. Per-request SDK timeouts, if present, are not a total multi-turn bound. The stream interface drops `stop_reason`, and every nonthrowing exhaustion becomes `done`, including a `max_tokens` response. Installed SDK `src/lib/tools/BetaToolRunner.ts:130-135,177-207` also ends a capped run normally and resolves the last message; simply adding `max_iterations` would still falsely claim completion on exhaustion. An injected engine resolving without a terminal event also leaves the registry generating forever.
- **Suggestion:** Define a total deadline and bounded turn budget, cancel the transport and tools on expiry, retain final stop reason, and distinguish successful end-turn from truncation/refusal/budget exhaustion/interruption. Add a server-side terminal fallback for an engine that resolves without a terminal event. A timeout must not leave background writes authorized.
- **Regression criteria:** Real SDK/local SSE fixtures for end-turn, max-tokens, refusal, repeated tool-use, stalled stream and timeout; exactly one honest terminal outcome in both registry and events, no residual requests/writes after it, and retry works. Include a fake engine that returns silently.
- **Status:** Open, confirmed source gap; installed SDK behavior inspected, no live generation acceptance.

### R3: Startup recovery and exclusive home ownership are absent

- **Severity:** High
- **File:line:** `sidecars/quasar-service/src/index.ts:10-18`, `sidecars/quasar-service/src/server.ts:63-83,241-242`, `sidecars/quasar-service/src/registry.ts:6-25`.
- **Description / evidence:** Startup serves immediately without recovering persisted `generating` rows. SIGTERM stops previews only; a killed/restarted service retains generating status and future edits receive 409 indefinitely. Registry serialization is scoped to one server instance. Two processes using one `QUASAR_HOME` on different ports can independently reserve the same slug and overwrite registry snapshots despite atomic rename. Recovery that rewrites another live owner's jobs would introduce a second failure.
- **Suggestion:** Acquire exclusive ownership of the home before reading/recovering/mutating it; reject a second live owner and safely distinguish stale ownership. Under that ownership, persist interrupted jobs as a truthful terminal failure before accepting mutations. Stop accepting requests during bounded generation/preview shutdown. Do not kill unrelated processes by port or a stale PID alone.
- **Regression criteria:** Child-process crash during generation then restart: durable interrupted state, recoverable retry, no old completion accepted. Concurrent startup against the same home is refused without modifying live state. Separate homes work. Shutdown and failed-start cleanup remove only owned resources.
- **Status:** Open, confirmed source gap.

### R4: Terminal event can precede and contradict durable registry state

- **Severity:** High
- **File:line:** `sidecars/quasar-service/src/server.ts:97-112,119-127`.
- **Description / evidence:** `bus.emit(done/error)` runs before the asynchronous final registry write. A failed write is only logged, so clients observe success while the persisted row remains generating. Even without failure, an immediate edit after observing done can race finalization and receive 409. The local terminal boolean neither fences duplicate/late engine emissions nor associates finalization with a particular job epoch.
- **Suggestion:** Use a single owned finalization transition; persist the terminal state before publishing it, handle persistence failure explicitly, and verify current job identity within the registry lock. Ignore all late or duplicate events after finalization. Recovery must handle a crash between durable commit and event publication.
- **Regression criteria:** Inject terminal write failure and delayed persistence; no false done, no permanently unrecoverable generating row, deterministic immediate retry behavior. Duplicate terminal and late old-job callbacks cannot modify a replacement job's state.
- **Status:** Open, confirmed source ordering/error-handling defect.

### R5: Legacy unknown OAuth links still grant admin

- **Severity:** High, existing-database release blocker
- **File:line:** `src/lib/server/admin.server.ts:34-39,49-54`; `migrations/0001_auth.sql:40-54`; admission hook `src/lib/auth/server.ts` (`user.validateUserInfo`).
- **Description / evidence:** Admin loads only linked provider names, not a verified address assertion or provenance. An allowlisted user with an unknown historical Google/Apple link is admitted, even from a password session. The current OAuth assertion gate applies to a new provider interaction; it cannot prove a pre-existing row. The backend acceptance record already reports this seeded failure, and admin unit tests explicitly accept a credential+Apple account with local emailVerified=false. A global emailVerified requirement would not solve provenance and could reject legitimate explicit links whose local flag remains false.
- **Suggestion:** Store server-derived verification evidence bound to provider subject, user and the verified normalized address; grant admin only when that evidence matches the current allowlisted email. Use a new additive migration with unknown legacy rows denied pending operator review/reverification. Do not backfill trusted evidence from provider name, timestamps, local emailVerified or unvalidated stored token claims. Preserve user/account identifiers, sessions and per-user data; do not destructively relink or merge users to repair provenance.
- **Regression criteria:** Upgrade a seeded old schema: unknown legacy links remain denied through password/passkey and provider sessions until actual revalidation; verified matching links pass; mismatched addresses, unverified assertions, X/passkeys alone, revoked/unlinked evidence and changed local email fail. Verify additive migration, repeat/concurrent application, rollback/recovery, bystander preservation and seeded backup/restore. Exercise explicit link and returning sign-in, not just provisioning.
- **Status:** Open, source-confirmed and previously reproduced in the backend record. No claim of a new-provider email-mismatch exploit: installed Better Auth `dist/oauth2/link-account.mjs:24-47` gates assertions and rejects different emails by default, consistent with this configuration.

### R6: Delete reports success even when filesystem removal fails

- **Severity:** Medium
- **File:line:** `sidecars/quasar-service/src/server.ts:327-339`.
- **Description / evidence:** The recursive `rm` exception is swallowed, then the registry row is removed and 204 returned. Files containing generated/user material can remain as an untracked orphan and a later create may collide with the reused slug. This is distinct from R1: it occurs even with no generation running.
- **Suggestion:** Keep a recoverable deletion record or return an explicit partial failure; do not free the slug or claim complete deletion until owned filesystem removal succeeds. Preserve retryability and report safe errors.
- **Regression criteria:** Inject permissions/I/O removal failure; deletion is not advertised as complete, retry succeeds, and another site cannot reuse the unresolved directory. Missing directories remain idempotent.
- **Status:** Open, confirmed error-handling defect.

### R7: Event cursors cannot reliably distinguish job replacement

- **Severity:** Medium
- **File:line:** `sidecars/quasar-service/src/events.ts:12-13,35-37`, `sidecars/quasar-service/src/server.ts:117-118,262-267`; client reconciliation `sidecars/quasar-service/shared/connection.ts:217-225`.
- **Description / evidence:** Reset clears the same buffer and restarts its numeric cursor without a job epoch. The client recognizes replacement only when `page.next < since`. If the previous cursor is 2 and a replacement produces 3 events before the next poll, `since(2)` returns only its third event; old feed content remains and the first two new events are lost. Resetting in place also preserves callbacks from the previous job. No retention/drop path bounds deleted-site event entries.
- **Suggestion:** Return and validate a job/stream epoch with cursors, make replacement explicit, detach/fence old publishers, and bound retention with documented replay semantics.
- **Regression criteria:** Poll across replacement when new event count is less than, equal to and greater than the old cursor; the new feed is complete and contains no old events. Repeated generation/deletion does not retain unbounded obsolete feeds.
- **Status:** Open, confirmed cursor ambiguity by source inspection.

### R8: Six narrated exports are not implemented by the frame transport

- **Severity:** High deliverable/acceptance blocker, not a demonstrated FFmpeg defect
- **File:line:** `scripts/export-films.ts:1-2,95-111`; `src/cinematic/film/speech.ts` (`speak`/`primeNeural` capture guards).
- **Description / evidence:** The existing export explicitly supplies frames only and leaves encoder settings/process ownership to a future caller. Capture intentionally disables speech. No narration synthesis, timed PCM assembly, muxer invocation or media probe was found in the reviewed pipeline. The Writable regression uses arbitrary buffers, proving backpressure/error transport, not real PNG parsing, 30fps encoding, audio sync, codec duration or six complete outputs. The production briefs correctly call cue slots budgets rather than measured narration.
- **Suggestion:** Add a separately auditable synthesis/encode consumer; measure samples at the declared sample rate, reject cue overruns instead of truncating or silently speeding speech, place each cue at its exact timeline offset, and explicitly pad the silent gaps/tail. Consume concatenated PNGs as FFmpeg image2pipe with PNG codec and explicit input 30fps, not rawvideo or wall-clock screenshot timing. Own and bound the encoder, drain stderr, require zero exit and successful full decode/probe, and publish only validated outputs via temporary-file replacement. Do not let `-shortest` silently shorten the film to the narration endpoint.
- **Regression criteria:** Actual PNGs through actual FFmpeg with frame count `ceil(duration*30)` and output video duration within one frame; audio begins at measured cue offsets, extends through the intended film tail and has audible nonzero narration. Fractional cue starts, gaps, overrun, final cue, failed synthesis, EPIPE, nonzero encoder exit, timeout and interrupted partial output are tested. All six movies fully decode and play with matching captions/transcripts/posters/downloads. Record model/voice/prosody/script/source hashes and inspect final visual/spoken claims. Encoding receipts must distinguish local synthesized media from live-service acceptance.
- **Status:** Open, confirmed missing deliverable; no actual FFmpeg framing/timing/audio acceptance performed here.

## Recommended acceptance order

1. Close R1-R4 and R6-R7 with deterministic sidecar fixtures and independent re-review of the **final** diff; include real SDK/local-stream contract tests and owned subprocess crash/restart tests. Root tests do not cover this sidecar. Do not substitute aborting a Promise for revoking writes.
2. Close R5 with provenance-aware admission and a seeded, non-destructive upgrade/reverification test. Existing-database deployment stays blocked until historical unknown identities are denied or reviewed. Fresh isolated staging does not qualify old production data.
3. Close R8 with measured synthesis and actual encoded artifact probes/playback, then final claims review and player integration. Controlled screenshots and silent exports cannot satisfy narrated-film acceptance.
4. Run repository root gate, sidecar gate and affected static/browser gates against the final integrated state, recording SHA/diff and exact receipts. Re-review source changes made after this snapshot before accepting them.
5. Live Quasar generation/edit/preview remains blocked by the recorded provider billing refusal, not established credential absence. Retry only after operator-resolved provider state changes. Real OAuth, physical authenticators, staging durability/deployment and production cutover remain separate acceptance boundaries. No gate or this review authorizes billing changes or production publication.

## Review limitations

Source inspection can establish missing guards and explicit control-flow defects, but this pass did not dynamically reproduce filesystem races or qualify provider behavior. The installed library trace narrows the auth finding to historical provenance rather than asserting an unproven new-link bypass. No provenance migration or encoder was visible. No Rust `unwrap()`, unnecessary Rust clone or Rust lock code is in this scoped TypeScript/Bun review; the process-local registry mutex was assessed for correctness, particularly its ownership limits.

## Late concurrent implementation diff review

The final check still reported HEAD `ac8c24afe618f34a7ed46ea0baed477133064c40`, but now exposed eight modified files (`shared/index.ts`, `src/{engine,events,index,registry,scaffold,server,siteFs}.ts`) and new `src/job.ts` / `src/ownership.ts` under `sidecars/quasar-service`. The captured tracked diff was 160 insertions / 77 deletions. Read that full diff and both new files. This is an in-progress snapshot, not a frozen final manifest or passing gate.

- **R1:** Candidate fix visible: JobScope closes admission, propagates AbortSignal, tracks/drains accepted writes and scaffold work, and deletion waits for completion before removal. This addresses the baseline resurrection mechanism by retaining ownership until writes settle. Do not weaken draining to a timeout followed by directory reuse. Regression evidence is still required; hung accepted operations/installer child cleanup can make draining unbounded.
- **R2:** Candidate fix visible: total timer, `max_iterations:24`, `runToolsEagerly:false`, end-turn-only success, transport AbortSignal and silent-engine fallback. Existing baseline fake runners lack stop reasons and several old error-message assertions will need intentional updates. Validate through actual SDK fixtures rather than only changing mocks.
- **R3:** Candidate fix visible: canonical-home loopback reservation plus startup recovery, with declared single-host limitation. Startup/shutdown error ownership still needs review (R10), and acceptance must establish exclusivity/crash release rather than assume it.
- **R4:** Candidate fix visible: terminal persistence precedes publication, job identity/finishedAt guard, late event gate and retained fence on persistence failure. Not accepted without delayed/failed commit fixtures and retry/restart proof.
- **R6:** Candidate fix visible: `rm` failures now propagate and the registry row is retained. Need deletion-failure/retry regression.
- **R5 / R8:** No auth or narrated encoder changes were visible; these remain open.
- **R7:** Reset now creates a fresh JobEvents object, isolating old subscribers, but still returns only numeric cursors. The count-equal/count-greater replacement ambiguity remains; retention is still unbounded. Status remains open, partially addressed.

### R9: Shutdown can miss an already admitted request that starts a new job

- **Severity:** High
- **File:line (late snapshot):** `sidecars/quasar-service/src/server.ts:205-219,249-261,489-495`.
- **Description / evidence:** Create/edit check `closing` before awaiting JSON parsing and registry acquisition, not inside the final mutation lock. Shutdown sets closing, snapshots/cancels current jobs, awaits that snapshot, and releases ownership. A request that passed the initial check but is still parsing or queued can then install a job absent from the shutdown snapshot. Preview start also has no closing guard. Ownership can therefore be released while admitted work still executes. This is a source race, not a dynamically reproduced failure.
- **Suggestion:** Fence all mutation admission under the same lifecycle/registry barrier as shutdown; recheck closing at reservation/commit, reject preview starts after closure, and drain already admitted HTTP mutation work before taking the final job snapshot and releasing ownership. Stop new request admission early, not only after drains.
- **Regression criteria:** Hold create/edit after initial admission and before lock acquisition, invoke shutdown, then resume. No job/preview starts after closure, no registry/files change after ownership release, and a new owner never overlaps old mutation work.
- **Status:** Open in captured in-progress diff.

### R10: Failed server construction leaks the newly acquired home reservation

- **Severity:** Medium
- **File:line (late snapshot):** `sidecars/quasar-service/src/server.ts:79-81,450-495`; `sidecars/quasar-service/src/ownership.ts:7-20`.
- **Description / evidence:** `ownHome` acquires a live listener before pairing/policy validation and Bun.serve. A later synchronous error (invalid policy, pairing filesystem failure or service port conflict) exits createServer without invoking releaseHome. In a surviving host/test process, a retry sees the home as owned and the listener retains a resource. Additionally, recovery is launched before the HTTP listener bind succeeds, so releasing on bind failure alone must not abandon an in-flight recovery write.
- **Suggestion:** Treat construction as an owned resource transaction: validate before acquisition where possible; ensure any failure drains/settles startup work and releases the reservation. Prefer an explicit asynchronous ready/start contract if necessary. Do not leave background recovery writing after failed ownership cleanup.
- **Regression criteria:** Force pairing/policy and bind failures, retry in the same process and verify immediate safe recovery, no leaked reservation/listener or late startup write, with unrelated listeners preserved.
- **Status:** Open in captured in-progress diff.

**Updated acceptance verdict:** The candidate patch materially addresses baseline lifecycle gaps, but is not yet accepted. R5, R7, R8 and late-snapshot R9-R10 remain actionable; R1-R4/R6 require the listed regression receipts and final-diff reconciliation. This reviewer did not observe later tests or subsequent edits and does not certify them.
