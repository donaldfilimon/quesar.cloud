// Ported from mlai `apps/mlai/lib/quasar-api.ts` at b6f3686. The browser talks to
// the Quasar service directly through the configured origin; this module never
// spawns it. Quesar changes: the fallback origin can come from the server
// (`QUASAR_SERVICE_ORIGIN`) through `setFallbackOrigin`, and `recover` /
// `isUncertain` are exposed so the screens can offer the Retry that
// `Connection.mutate` asks for.
import {
  Connection,
  ORIGIN_KEY,
  type GenerationEvent,
  type PreviewStatus,
  type Site,
} from "./index";

const memory = new Map<string, string>();

function readLocal(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

let fallback: () => Promise<string | null> = async () => null;

const storage = {
  async getItem(key: string) {
    const stored = readLocal(key) ?? memory.get(key) ?? null;
    if (stored) return stored;
    // Nothing saved on this device: use the deployment default, if any. It is
    // not written back, so a later deployment change still reaches this device.
    return key === ORIGIN_KEY ? await fallback().catch(() => null) : null;
  },
  async setItem(key: string, value: string) {
    memory.set(key, value);
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
};

let connection = new Connection(storage);

/**
 * Supplies the origin used when this device has none saved. Call before the
 * first request; the connection reads storage once per document.
 */
export function setFallbackOrigin(resolve: () => Promise<string | null>) {
  fallback = resolve;
}

/** A new document: storage is unchanged, and the origin is unread until hydrate. */
export function beginColdLoad() {
  connection = new Connection(storage);
}

/** Reads the saved origin before a screen displays it. */
export async function hydrateOrigin() {
  await connection.hydrate();
  return connection.origin;
}

/** The origin saved on this device only (not the deployment fallback). */
export async function storedOrigin() {
  return readLocal(ORIGIN_KEY) ?? memory.get(ORIGIN_KEY) ?? null;
}

export function getBaseUrl() {
  return connection.origin;
}

export function setBaseUrl(url: string) {
  return connection.save(url);
}

export function subscribeOrigin(listener: () => void) {
  return connection.subscribe(listener);
}

export function isUncertain() {
  return connection.isUncertain();
}

export function recover(refresh: (siteId: string | null | undefined) => Promise<void>) {
  return connection.recover(refresh);
}

export function listSites() {
  return connection.request<Site[]>("/api/sites");
}

export function createSite(body: { name: string; prompt: string }) {
  return connection.mutate(null, () =>
    connection.request<Site>("/api/sites", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export function getSite(id: string) {
  return connection.request<Site>(`/api/sites/${encodeURIComponent(id)}`);
}

export function editSite(id: string, prompt: string) {
  return connection.mutate(id, () =>
    connection.request<Site>(`/api/sites/${encodeURIComponent(id)}/edit`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
  );
}

export function getEvents(id: string, since: number) {
  return connection.request<{ events: GenerationEvent[]; next: number }>(
    `/api/sites/${encodeURIComponent(id)}/events?since=${since}`,
  );
}

export function previewStatus(id: string) {
  return connection.request<PreviewStatus>(`/api/sites/${encodeURIComponent(id)}/preview`);
}

export function previewStart(id: string) {
  return connection.mutate(id, () =>
    connection.request<PreviewStatus>(
      `/api/sites/${encodeURIComponent(id)}/preview/start`,
      { method: "POST" },
      120_000,
    ),
  );
}

export function previewStop(id: string) {
  return connection.mutate(id, () =>
    connection.request<PreviewStatus>(
      `/api/sites/${encodeURIComponent(id)}/preview/stop`,
      { method: "POST" },
      15_000,
    ),
  );
}

/**
 * The service reports previews as `http://localhost:<port>`. When the service
 * runs on another host (a LAN machine), point the URL at that host instead, as
 * the Quasar Expo app did. Returns null for anything that is not HTTP(S).
 */
export function previewHref(url: string | null, serviceOrigin: string): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const local = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"];
  if (local.includes(parsed.hostname)) {
    try {
      const service = new URL(serviceOrigin);
      if (!local.includes(service.hostname)) parsed.hostname = service.hostname;
    } catch {
      // Keep the service-reported host.
    }
  }
  return parsed.toString();
}
