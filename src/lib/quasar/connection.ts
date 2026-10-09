// Vendored from mlai `apps/quasar/packages/shared/src/connection.ts` at b6f3686
// (donaldfilimon/MLAI-CORPORATION-WWW). Pairing adds origin-scoped credentials
// and cancellation on credential changes. Keep both copies on one wire contract.

export const DEFAULT_ORIGIN = "http://localhost:4700";
export const credentialKey = (origin: string) => `quasar.pairing:${normalizeOrigin(origin)}`;
export const ORIGIN_KEY = "quasar.serviceOrigin";

export interface OriginStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
}

export function normalizeOrigin(input: string): string {
  const text = input.trim();
  if (!/^https?:\/\/[^/?#@\\]+\/?$/i.test(text))
    throw new Error("Use an HTTP(S) origin without credentials or a path.");
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error("Enter an HTTP or HTTPS server origin.");
  }
  if (
    !/^https?:\/\//i.test(text) ||
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /[?#]/.test(text) ||
    url.pathname !== "/"
  ) {
    throw new Error("Use an HTTP(S) origin only, without credentials, path, query, or fragment.");
  }
  return url.origin;
}

export function requireCredentialTransport(origin: string): void {
  const url = new URL(origin);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("Pairing credentials require HTTPS for non-loopback services.");
}

export class Connection {
  origin = DEFAULT_ORIGIN;
  revision = 0;
  private ready?: Promise<void>;
  private listeners = new Set<() => void>();
  private active = new Set<AbortController>();
  private writing = false;
  private recovering = false;
  private uncertain = new Map<string, string | null>();

  constructor(
    private storage: OriginStorage,
    private fetcher: typeof fetch = fetch,
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  hydrate(): Promise<void> {
    return (this.ready ??= this.storage.getItem(ORIGIN_KEY).then((value) => {
      if (value) this.change(normalizeOrigin(value));
    }));
  }

  private change(origin: string) {
    if (origin === this.origin) return;
    this.origin = origin;
    this.revision++;
    for (const controller of this.active) controller.abort();
    for (const listener of this.listeners) listener();
  }

  async save(value: string) {
    const origin = normalizeOrigin(value);
    // A failed initial read can be repaired explicitly by saving an origin.
    await this.hydrate().catch(() => {});
    await this.storage.setItem(ORIGIN_KEY, origin);
    this.change(origin);
    this.ready = Promise.resolve();
  }

  async saveCredential(value: string) {
    await this.hydrate();
    requireCredentialTransport(this.origin);
    const token = value.trim();
    if (!/^[A-Za-z0-9_-]{43,}$/.test(token)) throw new Error("Enter the operator's pairing token.");
    await this.storage.setItem(credentialKey(this.origin), token);
    this.invalidate();
  }

  async hasCredential() {
    await this.hydrate();
    return Boolean(await this.storage.getItem(credentialKey(this.origin)));
  }

  async clearCredential() {
    await this.hydrate();
    const key = credentialKey(this.origin);
    if (this.storage.removeItem) await this.storage.removeItem(key);
    else await this.storage.setItem(key, "");
    this.invalidate();
  }

  private invalidate() {
    this.revision++;
    for (const controller of this.active) controller.abort();
    for (const listener of this.listeners) listener();
  }

  async request<T>(path: string, init: RequestInit = {}, timeout = 15_000): Promise<T> {
    await this.hydrate();
    const revision = this.revision;
    const origin = this.origin;
    if (!path.startsWith("/api/") || path.includes("\\"))
      throw new Error("Invalid service API path");
    const controller = new AbortController();
    const abort = () => controller.abort();
    init.signal?.addEventListener("abort", abort, { once: true });
    if (init.signal?.aborted) controller.abort();
    this.active.add(controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const cancelled = new Promise<never>((_, reject) => {
        const fail = () =>
          reject(new Error("Connection cancelled. Refresh state before trying again."));
        controller.signal.addEventListener("abort", fail, { once: true });
        if (controller.signal.aborted) fail();
        timer = setTimeout(() => {
          reject(new Error("Connection timed out. Refresh state before trying again."));
          controller.abort();
        }, timeout);
      });
      const work = async () => {
        const token = await this.storage.getItem(credentialKey(origin));
        if (revision !== this.revision || controller.signal.aborted)
          throw new Error("Connection changed before request.");
        const headers = new Headers(init.headers);
        if (init.body && !headers.has("content-type"))
          headers.set("content-type", "application/json");
        if (token) {
          requireCredentialTransport(origin);
          headers.set("authorization", `Bearer ${token}`);
        } else headers.delete("authorization");
        const response = await this.fetcher.call(globalThis, `${origin}${path}`, {
          ...init,
          signal: controller.signal,
          redirect: "error",
          credentials: "omit",
          headers,
        });
        if (!response.ok) throw new Error((await response.text()) || response.statusText);
        return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
      };
      const result = await Promise.race([work(), cancelled]);
      if (revision !== this.revision) throw new Error("Server changed. Discarded old response.");
      return result;
    } finally {
      clearTimeout(timer);
      this.active.delete(controller);
      init.signal?.removeEventListener("abort", abort);
    }
  }

  async mutate<T>(siteId: string | null, action: () => Promise<T>): Promise<T> {
    // Claim synchronously, before hydration or any request can yield.
    if (this.writing || this.recovering)
      throw new Error("An action or state refresh is already pending.");
    this.writing = true;
    let origin: string | undefined;
    try {
      await this.hydrate();
      origin = this.origin;
      if (this.uncertain.has(origin))
        throw new Error(
          "Previous action outcome is uncertain. Use Retry to refresh state before another action.",
        );
      try {
        return await action();
      } catch (error) {
        this.uncertain.set(origin, siteId);
        throw error;
      }
    } finally {
      this.writing = false;
    }
  }

  async recover(refresh: (siteId: string | null | undefined) => Promise<void>) {
    // Own the entire refresh, including hydration. No action or second retry
    // may overtake its read and then have newer uncertainty cleared by it.
    if (this.writing || this.recovering)
      throw new Error("An action or state refresh is already pending.");
    this.recovering = true;
    try {
      await this.hydrate();
      const origin = this.origin;
      const revision = this.revision;
      await refresh(this.uncertain.get(origin));
      if (revision !== this.revision) throw new Error("Server changed during refresh.");
      this.uncertain.delete(origin);
    } finally {
      this.recovering = false;
    }
  }

  /** Whether the current origin has an unresolved mutation (quesar addition, read-only). */
  isUncertain() {
    return this.uncertain.has(this.origin);
  }
}

// Bind a response to both parts of its captured request cursor. Equal offsets
// from an obsolete epoch must not roll a replacement feed back.
export function applyEventPage<T>(
  current: { events: T[]; next: number; epoch?: string },
  since: number,
  page: { events: T[]; next: number; epoch?: string },
  requestedEpoch?: string,
) {
  if (since !== current.next || requestedEpoch !== current.epoch) return current;
  if (page.epoch && page.epoch !== current.epoch)
    return { events: page.events, next: page.next, epoch: page.epoch };
  if (page.next < since) return { events: page.events, next: page.next };
  return {
    events: [...current.events, ...page.events],
    next: page.next,
    ...(page.epoch ? { epoch: page.epoch } : {}),
  };
}

export function assertMatchingJob(siteJobId?: string, feedJobId?: string): void {
  if (siteJobId !== feedJobId) throw new Error("Job changed during refresh.");
}
