import type { Server, ServerWebSocket } from "bun";
import type { PreviewManager } from "./preview";
import { PreviewSessions } from "./security";

export interface SocketData { site: string; session: string; upstream: WebSocket; timer?: ReturnType<typeof setInterval>; client?: ServerWebSocket<SocketData> }
const cookieName = (site: string) => `quasar_preview_${site.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
export class PreviewProxy {
  readonly sessions = new PreviewSessions();
  private sockets = new Set<SocketData>();
  constructor(private preview: PreviewManager) {}
  revoke(site?: string) {
    this.sessions.revoke(site);
    for (const data of this.sockets) if (!site || data.site === site) { data.client?.close(1008, "Session revoked"); data.upstream.close(); }
  }
  async handle(req: Request, server: Server<SocketData>, serviceOrigin: string, allowedOrigins: Set<string>): Promise<Response | undefined> {
    const url = new URL(req.url);
    const match = /^\/preview\/([a-zA-Z0-9_-]+)(\/.*)?$/.exec(url.pathname);
    if (!match) return new Response("Not found", { status: 404 });
    const site = match[1]!;
    const base = `/preview/${site}`;
    const origin = req.headers.get("origin");
    const transport = this.preview.transport(site);
    if (!transport) return new Response("Preview stopped", { status: 410 });
    if (url.pathname === `${base}/launch`) {
      if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
      if (!origin || !allowedOrigins.has(origin)) return new Response("Forbidden origin", { status: 403 });
      if (!req.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return new Response("Invalid form", { status: 415 });
      const body = await req.text();
      if (body.length > 256) return new Response("Invalid form", { status: 400 });
      const session = this.sessions.redeem(new URLSearchParams(body).get("ticket") ?? "", site, origin);
      if (!session) return new Response("Launch ticket expired or already used", { status: 401 });
      return new Response(null, { status: 303, headers: {
        Location: `${base}/`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
        "Set-Cookie": `${cookieName(site)}=${session}; Path=${base}; HttpOnly; SameSite=Lax; Max-Age=${this.sessions.ttl / 1000}${serviceOrigin.startsWith("https:") ? "; Secure" : ""}`,
      } });
    }
    const cookie = req.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${cookieName(site)}=`));
    const session = cookie?.slice(cookieName(site).length + 1) ?? "";
    if (!this.sessions.valid(session, site)) return new Response("Preview session required. Open it from Quasar.", { status: 401 });
    const upgrade = req.headers.get("upgrade")?.toLowerCase() === "websocket";
    if ((origin && origin !== serviceOrigin) || (upgrade && origin !== serviceOrigin) || (!['GET', 'HEAD'].includes(req.method) && origin !== serviceOrigin))
      return new Response("Forbidden origin", { status: 403 });
    if (req.headers.get("sec-fetch-site") === "cross-site" && req.headers.get("sec-fetch-mode") !== "navigate") return new Response("Forbidden site", { status: 403 });
    const headers = new Headers(req.headers);
    for (const name of ["authorization", "cookie", "host", "connection", "upgrade", "x-quasar-preview", "forwarded", "x-forwarded-host", "x-forwarded-proto", "accept-encoding", "sec-websocket-key", "sec-websocket-version", "sec-websocket-extensions", "sec-websocket-protocol"]) headers.delete(name);
    headers.set("x-quasar-preview", transport.secret);
    // Next's dev-origin check sees the local transport, never an untrusted Host.
    headers.set("origin", `http://127.0.0.1:${transport.port}`);
    const target = `127.0.0.1:${transport.port}${url.pathname}${url.search}`;
    if (upgrade) {
      const ClientSocket = WebSocket as unknown as { new(url: string, options: Bun.WebSocketOptions): WebSocket };
      const upstream = new ClientSocket(`ws://${target}`, { headers: Object.fromEntries(headers) });
      upstream.binaryType = "arraybuffer";
      const data: SocketData = { site, session, upstream };
      const connected = await new Promise<boolean>(resolve => {
        const timer = setTimeout(() => { upstream.close(); resolve(false); }, 5000);
        upstream.onopen = () => { clearTimeout(timer); resolve(true); };
        upstream.onerror = () => { clearTimeout(timer); resolve(false); };
      });
      if (!connected) return new Response("Preview upgrade unavailable", { status: 502 });
      if (!this.sessions.valid(session, site)) { upstream.close(); return new Response("Session expired", { status: 401 }); }
      upstream.onmessage = event => data.client?.send(event.data as string | ArrayBuffer);
      upstream.onclose = () => data.client?.close();
      upstream.onerror = () => data.client?.close(1011, "Preview connection failed");
      if (server.upgrade(req, { data })) return undefined;
      upstream.close();
      return new Response("Upgrade failed", { status: 400 });
    }
    const upstream = await fetch(`http://${target}`, { method: req.method, headers, body: req.body, redirect: "manual", signal: req.signal });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ["set-cookie", "access-control-allow-origin", "access-control-allow-credentials", "content-encoding", "content-length"]) responseHeaders.delete(name);
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("Referrer-Policy", "no-referrer");
    responseHeaders.set("X-Frame-Options", "DENY");
    responseHeaders.set("Origin-Agent-Cluster", "?1");
    responseHeaders.set("Cross-Origin-Resource-Policy", "same-origin");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  }
  websocket = {
    open: (ws: ServerWebSocket<SocketData>) => {
      ws.data.client = ws;
      this.sockets.add(ws.data);
      ws.data.timer = setInterval(() => { if (!this.sessions.valid(ws.data.session, ws.data.site)) ws.close(1008, "Session expired"); }, 1000);
    },
    message: (ws: ServerWebSocket<SocketData>, message: string | Buffer) => {
      if (!this.sessions.valid(ws.data.session, ws.data.site)) { ws.close(1008, "Session expired"); return; }
      if (ws.data.upstream.readyState === WebSocket.OPEN) ws.data.upstream.send(typeof message === "string" ? message : new Uint8Array(message));
    },
    close: (ws: ServerWebSocket<SocketData>) => {
      clearInterval(ws.data.timer); this.sockets.delete(ws.data); ws.data.upstream.close();
    },
  };
}
