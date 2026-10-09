/** Configuration readiness only: this does not claim DB connectivity or schema acceptance. */
type Environment = Record<string, string | undefined>;
type OptionalState = "configured" | "not_configured" | "invalid";
function validDatabase(raw: string | undefined): boolean {
  try {
    const url = new URL(raw ?? "");
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      url.pathname.length > 1 &&
      !url.hash
    );
  } catch {
    return false;
  }
}
/** A public HTTPS origin, without credentials, paths, query or fragments. */
export function validAuthOrigin(raw: string | undefined): boolean {
  try {
    const url = new URL(raw ?? "");
    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
function keyState(raw: string | undefined): OptionalState {
  if (!raw?.trim()) return "not_configured";
  const value = raw.trim();
  if (/^[a-fA-F0-9]{64}$/.test(value)) return "configured";
  if (!/^[A-Za-z0-9+/_-]{43}=?$/.test(value)) return "invalid";
  return Buffer.from(value, "base64").length === 32 ? "configured" : "invalid";
}
export function runtimeReadiness(
  environment: Environment = process.env,
  staticMode = false,
  persistentMode = false,
) {
  const reasons: string[] = [];
  const read = (name: string) => environment[name]?.trim() || undefined;
  if (persistentMode && staticMode) reasons.push("static_mode_forbidden");
  const bypass = staticMode && !persistentMode;
  if (!bypass) {
    if (persistentMode || read("NODE_ENV") === "production") {
      if (!validDatabase(read("DATABASE_URL"))) reasons.push("database_unavailable");
      if ((read("BETTER_AUTH_SECRET")?.length ?? 0) < 32) reasons.push("session_secret_invalid");
      if (!validAuthOrigin(read("BETTER_AUTH_URL"))) reasons.push("auth_origin_invalid");
    }
    if (read("DATABASE_URL") && read("VITE_AUTH_ENABLED") === "false")
      reasons.push("auth_disabled_with_database");
  }
  return {
    ready: reasons.length === 0,
    reasons,
    optional: {
      encryption: keyState(read("APP_ENCRYPTION_KEY")),
      previousEncryptionKey: keyState(read("APP_ENCRYPTION_KEY_PREVIOUS")),
    },
  };
}
export function readinessResponse(state: ReturnType<typeof runtimeReadiness>): Response {
  return Response.json(state, {
    status: state.ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
/** Called before importing runtime auth/DB services. */
export function checkRuntimeRequest(
  request: Request,
  staticMode = false,
  persistentMode = false,
): Response | undefined {
  const state = runtimeReadiness(process.env, staticMode, persistentMode);
  if (new URL(request.url).pathname === "/api/readiness") {
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    const response = readinessResponse(state);
    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  }
  if (!state.ready) return readinessResponse(state);
}
