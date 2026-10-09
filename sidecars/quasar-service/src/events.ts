import type { GenerationEvent } from "../shared/index";

export class JobEvents {
  readonly epoch = crypto.randomUUID();
  events: GenerationEvent[] = [];
  private subscribers: Set<(ev: GenerationEvent) => void> = new Set();

  emit(ev: GenerationEvent): void {
    this.events.push(ev);
    for (const cb of this.subscribers) { try { cb(ev); } catch { /* subscribers do not own job state */ } }
  }

  since(cursor: number): { events: GenerationEvent[]; next: number } {
    return { events: this.events.slice(cursor), next: this.events.length };
  }

  subscribe(cb: (ev: GenerationEvent) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }
}

// Retain at most 128 inactive site feeds, oldest completion/creation first.
// Polling does not refresh retention; running or draining jobs are never evicted.
export class EventBus {
  private jobs = new Map<string, JobEvents>();
  private inactive = new Set<string>();

  constructor(private readonly maxInactive = 128) {
    if (!Number.isSafeInteger(maxInactive) || maxInactive < 0) throw new Error("Invalid feed retention limit");
  }

  get(siteId: string): JobEvents {
    let job = this.jobs.get(siteId);
    if (!job) {
      job = new JobEvents();
      this.jobs.set(siteId, job);
      this.inactive.add(siteId);
      this.prune();
    }
    return job;
  }

  reset(siteId: string): void {
    this.inactive.delete(siteId);
    this.jobs.set(siteId, new JobEvents());
  }

  finish(siteId: string, job: JobEvents): void {
    if (this.jobs.get(siteId) !== job) return;
    this.inactive.add(siteId);
    this.prune();
  }

  delete(siteId: string): void {
    this.inactive.delete(siteId);
    this.jobs.delete(siteId);
  }

  private prune(): void {
    while (this.inactive.size > this.maxInactive) {
      const oldest = this.inactive.values().next().value!;
      this.inactive.delete(oldest);
      this.jobs.delete(oldest);
    }
  }
}
