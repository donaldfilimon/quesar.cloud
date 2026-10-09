# Task 2 durability fault qualification — 2026-10-09

**Latest disposition:** the former direct-order proof gap is now Current for controlled success/error publication via the isolated observational regression in `publication.test.ts`; full sidecar typecheck/test exit 0, 113 tests / 486 expectations. [Closure evidence and remaining boundaries](publication-order-closure.md). The original fixture report below remains historical: its HTTP test still proves only mutex-visible consistency, not emitter order. No crash/power-loss qualification or production seam was added.

## Original fixture scope and receipts

Status: **Current controlled R4 persistence-failure and HTTP consistency qualification; direct internal publication ordering remains Partial**. Two tests added; production source, dependencies and protocol unchanged. Source frozen after final validation below.

Owned files: `sidecars/quasar-service/src/job.test.ts`, `sidecars/quasar-service/src/server.test.ts`, this report. Existing concurrent work preserved.

The permission-fault fixture runs the actual service in an owned child process. Its fake engine waits after actual create/scaffold admission. The child makes its home directory unwritable (`0500`), releases `done`, and observes exactly the existing safe terminal-persistence diagnostic. Assertions establish durable registry remains generating, event replay includes no done, edit returns 409, restored permissions do not turn the rejected completion into successful shutdown, and home remains owned while the child is alive. The parent terminates/reaps the child, restarts the same home, checks interrupted recovery and admits retry with a new job ID. Diagnostic text is asserted exactly; arbitrary provider/fs error contents are not emitted in the receipt.

The HTTP consistency fixture uses the existing `allocatePreviewPort` test injection to hold a real preview reservation under the service registry mutex. It releases the engine terminal while that reservation remains held, checks the durable row remains generating, and verifies the HTTP events response is pending. After releasing the reservation it observes done alongside settled durable state and proves immediate edit returns 202. The test harness forwards the existing allocation dependency; no production test seam was added.

All newly held promises have unconditional release. Parent waits for receipts, child exit, requests and retry shutdown are bounded; permission restoration, child termination/reaping, reader release, retry shutdown and temporary-home removal are in cleanup paths. The expected rejected shutdown remains confined to the child so the main test process does not retain its reservation/listener.

## Proof boundaries

R4's controlled persistence-failure, retained fence and restart recovery gaps are covered. The second fixture qualifies mutex serialization and HTTP-visible settled-state consistency. Because the events endpoint acquires the same registry mutex, it masks premature internal event publication: an early bus.emit could still produce the same observed pending response and later settled state. Direct internal publication ordering remains source-inspected and Partial; the fixture does not independently prove it. The test delays lock acquisition, not a filesystem write already in progress. It does not qualify crash exactly between durable commit and event publication, arbitrary disk failures, production storage, distributed ownership, remote preview DNS/TLS, provider behavior or production deployment. Overall historical service qualification remains Partial for those other explicitly recorded gaps.

## Validation

Focused `bun test src/job.test.ts src/server.test.ts --test-name-pattern 'terminal persistence permission|terminal event waits'`: exit 0, 2 pass, 0 fail, 35 filtered, 15 assertions across 2 files, 903 ms. Sidecar `bun run typecheck`: exit 0. Scoped `git diff --check`: exit 0.

Final frozen full sidecar `bun run test`: exit 0, **111 pass, 0 fail, 470 assertions across 14 files**, 20.24 seconds. Final typecheck exit 0. No root gates/builds, commits, providers or subagents invoked.

## Durability independent review fix round 1

D1 corrected by narrowing the held-mutex fixture name, source comment and report to HTTP-visible settled-state consistency and registry mutex serialization. The endpoint's own lock masks premature internal publication. Direct internal publication ordering remains source-inspected / Partial. External response, settled state and immediate retry assertions remain intact; no seam or module/prototype mock was added.

D2 corrected with immediate rejection observers on the held preview/events requests, retaining the original promises for assertions and cleanup. Reviewed the other new held fixtures and added the same immediate observers to deletion and shutdown promises. Engine/allocation gates resolve only, and child receipt/exit/retry waits already attach bounded race observers immediately.

Frozen focused validation: sidecar typecheck exit 0; `bun test src/job.test.ts src/server.test.ts --test-name-pattern 'terminal persistence permission|registry mutex serializes|shutdown retains|deletion drains'` exit 0, 4 pass, 0 fail, 33 filtered, 24 assertions across 2 files, 1344 ms. Scoped diff check exit 0. Full frozen receipt follows.

Full frozen sidecar `bun run test`: exit 0, **111 pass, 0 fail, 470 assertions across 14 files**, 55.59 seconds. Production source unchanged in this review fix round. Source frozen.
