# Direct publication-order proof disposition

2026-10-09. **Current controlled success/error publication-order regression**, rather than only source inspection or mutex-masked HTTP consistency. Production source/semantics, dependencies and public protocol unchanged. Sole new service file: `sidecars/quasar-service/src/publication.test.ts`.

## Observation and falsifiability

The actual service creates its private EventBus (`server.ts:88`) and buffers the engine's terminal event (`:161–165`). Completion drains accepted operations, awaits `finalizeJob`, then calls the real bus emitter (`:190–200`). Finalization writes the job outcome/finishedAt and awaits `writeRegistry` under the mutex (`:123–139`); the writer renames a per-write temporary file (`registry.ts:19–27`). The events endpoint itself takes that mutex, so the older HTTP fixture could not distinguish a premature internal emit.

Each new case owns a separate child process and temporary home. A **test-local observational wrapper** on exported `JobEvents.emit` synchronously records the registry file's status, outcome, exact job ID, finishedAt presence and accepted-write existence at emitter entry, then forwards the original emitter exactly once. No emitter buffer/registry implementation is replaced, and no production callback, bus exposure or injection seam is added. Observation failures are recorded rather than preventing the real emit; they fail the parent assertion. The wrapper is restored after shutdown and cannot affect another test process.

The existing allocatePreviewPort dependency holds a real registry mutex. The actual fake engine completes an accepted filesystem write and reports done/error while the lock remains held. Direct emitter observations must still be empty and the file generating. Once the allocation is released by a deliberate fixture exception, finalization proceeds: exactly one emitter observation must see the committed idle/done or error/error record, matching job ID, finishedAt and completed write. Real event replay must contain exactly that event. No preview child is started.

Moving `bus.emit(ev)` before the awaited finalization would make the observation visible while the lock is held, with generating/unsettled registry state; both early-publication and terminal-snapshot assertions reject it. The measurement does not acquire the events HTTP mutex and therefore closes the earlier masking gap. The wrapper adds bounded synchronous observation overhead but preserves the real emitter/buffer behavior. This is instrumented controlled regression coverage, not an uninstrumented runtime attestation.

## Actual gates

- `bun test src/publication.test.ts`: exit0,2passed,16expectations; [publication-order-focused.log](publication-order-focused.log).
- `bun run typecheck`: exit0; [publication-order-typecheck.log](publication-order-typecheck.log).
- Full documented sidecar `bun run test`: exit0,113passed/486expectations across15files; [publication-order-sidecar-gate.log](publication-order-sidecar-gate.log).

Children are reaped, held promises released in child finally blocks, and private temporary homes removed. No root/site/dependency change required a repeat root/browser/build gate. The root/static/compiled snapshot stays separately qualified by its existing hashes.

## Still unqualified

This proves controlled ordering of success/error publication after the observable registry rename and accepted-write completion. It does not prove fsync/power-loss durability, crash exactly between commit and publication, every cancellation/failure interleaving, arbitrary disks, remote providers, distributed writers or production storage. The older HTTP fixture and independent review remain accurate historical assessments. No speculative production change was made.
