import { timingSafeEqual, randomBytes } from "node:crypto";
import {
  mkdirSync,
  openSync,
  writeFileSync,
  closeSync,
  readFileSync,
  lstatSync,
  constants,
} from "node:fs";
import path from "node:path";
import { normalizeOrigin } from "../shared/connection";

export function secretEqual(a: string, b: string): boolean {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function newSecret(): string {
  return randomBytes(32).toString("base64url");
}
export function pairingSecret(home: string, override?: string): string {
  if (override !== undefined) {
    if (!/^[A-Za-z0-9_-]{43,}$/.test(override))
      throw new Error("QUASAR_PAIRING_TOKEN must be at least 43 base64url characters");
    return override;
  }
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const file = path.join(home, "pairing-token");
  try {
    const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(fd, newSecret() + "\n");
    } finally {
      closeSync(fd);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const stat = lstatSync(file);
  if (
    !stat.isFile() ||
    (stat.mode & 0o777) !== 0o600 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new Error("pairing-token must be an operator-owned regular file with mode 0600");
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const value = readFileSync(fd, "utf8").trim();
    if (!/^[A-Za-z0-9_-]{43,}$/.test(value)) throw new Error("Invalid pairing-token file");
    return value;
  } finally {
    closeSync(fd);
  }
}
export function networkPolicy(env: Record<string, string | undefined>) {
  const hostname = env.QUASAR_HOST ?? "127.0.0.1";
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname) && env.QUASAR_ALLOW_NETWORK !== "true")
    throw new Error("Non-loopback binding requires QUASAR_ALLOW_NETWORK=true");
  const allowedOrigins = (
    env.QUASAR_ALLOWED_ORIGINS ?? "http://localhost:8080,http://127.0.0.1:8080,https://quesar.cloud"
  )
    .split(",")
    .map(normalizeOrigin);
  if (allowedOrigins.some((origin) => new URL(origin).hostname.includes("*")))
    throw new Error("Origins must be exact");
  const publicOrigin = env.QUASAR_PUBLIC_ORIGIN
    ? normalizeOrigin(env.QUASAR_PUBLIC_ORIGIN)
    : undefined;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname) && !publicOrigin)
    throw new Error("Network binding requires QUASAR_PUBLIC_ORIGIN");
  if (
    publicOrigin &&
    new URL(publicOrigin).protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(publicOrigin).hostname)
  )
    throw new Error("Exposed service origin must use HTTPS");
  return { hostname, allowedOrigins, publicOrigin };
}

export class PreviewSessions {
  private tickets = new Map<
    string,
    { site: string; origin: string; generation: number; expires: number }
  >();
  private sessions = new Map<string, { site: string; generation: number; expires: number }>();
  constructor(
    private now = Date.now,
    readonly ttl = 30 * 60_000,
  ) {}
  private prune() {
    for (const [key, value] of this.tickets)
      if (value.expires <= this.now()) this.tickets.delete(key);
    for (const [key, value] of this.sessions)
      if (value.expires <= this.now()) this.sessions.delete(key);
  }
  issue(site: string, origin: string, generation: number) {
    this.prune();
    const ticket = newSecret();
    this.tickets.set(ticket, { site, origin, generation, expires: this.now() + 30_000 });
    return ticket;
  }
  redeem(ticket: string, site: string, origin: string, generation: number): string | null {
    this.prune();
    const value = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    if (!value || value.site !== site || value.origin !== origin || value.generation !== generation)
      return null;
    const session = newSecret();
    this.sessions.set(session, { site, generation, expires: this.now() + this.ttl });
    return session;
  }
  valid(session: string, site: string, generation: number): boolean {
    this.prune();
    const value = this.sessions.get(session);
    return value?.site === site && value.generation === generation;
  }
  revoke(site?: string) {
    for (const [key, value] of this.tickets)
      if (!site || value.site === site) this.tickets.delete(key);
    for (const [key, value] of this.sessions)
      if (!site || value.site === site) this.sessions.delete(key);
  }
}

/** Each generated site gets its own browser origin, including in loopback mode. */
export function previewOrigin(serviceOrigin: string, site: string, domain?: string): string {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(site))
    throw new Error("Invalid preview site id");
  const url = new URL(serviceOrigin);
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    url.hostname = `${site}.localhost`;
  } else {
    if (
      url.protocol !== "https:" ||
      !domain ||
      domain !== domain.toLowerCase() ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) ||
      domain === "localhost" ||
      domain.endsWith(".localhost") ||
      domain.length > 190
    )
      throw new Error(
        "Remote previews require HTTPS and QUASAR_PREVIEW_DOMAIN with wildcard DNS/TLS",
      );
    url.hostname = `${site}.${domain}`;
  }
  if (url.origin === serviceOrigin) throw new Error("Preview origin must be separate from the API");
  return url.origin;
}
