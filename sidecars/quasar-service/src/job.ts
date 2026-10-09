// Admission closes synchronously; accepted filesystem operations retain ownership
// until they settle. A deadline never pretends that an outstanding write stopped.
export class JobScope {
  readonly controller = new AbortController();
  private pending = new Set<Promise<unknown>>();
  check(): void { this.controller.signal.throwIfAborted(); }
  async accept<T>(operation: () => Promise<T>): Promise<T> {
    this.check();
    const promise = operation();
    this.pending.add(promise);
    try { return await promise; } finally { this.pending.delete(promise); }
  }
  cancel(reason: string): void { this.controller.abort(reason); }
  async drain(): Promise<void> {
    while (this.pending.size) await Promise.allSettled([...this.pending]);
  }
}
