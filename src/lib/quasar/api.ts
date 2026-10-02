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
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    memory.set(key, value);
  },
  async removeItem(key: string) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    memory.delete(key);
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

export const savePairing = (token: string) => connection.saveCredential(token);
export const hasPairing = () => connection.hasCredential();
export async function clearPairing() {
  // Online revocation must succeed before claiming sessions were revoked.
  await connection.request("/api/unpair", { method: "POST" });
  await connection.clearCredential();
}
export const forgetPairingLocally = () => connection.clearCredential();

export async function openPreview(id: string) {
  const origin = connection.origin;
  const name = `quasar-preview-${crypto.randomUUID()}`;
  const popup = window.open("about:blank", name);
  if (!popup) throw new Error("Allow a new tab to open this preview.");
  popup.opener = null;
  try {
    const launch = await connection.request<{ ticket: string; action: string }>(
      `/api/sites/${encodeURIComponent(id)}/preview/ticket`,
      { method: "POST" },
    );
    const target = new URL(launch.action);
    const service = new URL(origin);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(service.hostname);
    if (
      connection.origin !== origin ||
      target.protocol !== service.protocol ||
      target.port !== service.port ||
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      target.pathname !== `/preview/${encodeURIComponent(id)}/launch` ||
      (loopback
        ? target.hostname !== `${id}.localhost`
        : target.protocol !== "https:" ||
          !target.hostname.startsWith(`${id}.`) ||
          target.origin === origin)
    )
      throw new Error("Preview connection changed.");
    const form = document.createElement("form");
    form.method = "POST";
    form.action = target.href;
    form.target = name;
    const field = document.createElement("input");
    field.type = "hidden";
    field.name = "ticket";
    field.value = launch.ticket;
    form.append(field);
    document.body.append(form);
    try {
      form.submit();
    } finally {
      form.remove();
    }
  } catch (error) {
    popup.close();
    throw error;
  }
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

/** Accept only per-site preview origins and their protected path. */
export function previewHref(url: string | null, serviceOrigin: string): string | null {
  if (!url) return null;
  try {
    const target = new URL(url);
    const service = new URL(serviceOrigin);
    const match = /^\/preview\/([a-z0-9-]+)\/$/.exec(target.pathname);
    if (
      !match ||
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      target.protocol !== service.protocol ||
      target.port !== service.port
    )
      return null;
    const site = match[1];
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(service.hostname);
    if (
      loopback
        ? target.hostname !== `${site}.localhost`
        : target.protocol !== "https:" ||
          !target.hostname.startsWith(`${site}.`) ||
          target.origin === service.origin
    )
      return null;
    return target.href;
  } catch {
    return null;
  }
}
