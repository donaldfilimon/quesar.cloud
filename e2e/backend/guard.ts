/** This suite creates/drops only databases with a fresh per-run name. */
export function acceptanceTarget() {
  if (process.env.QUESAR_BACKEND_ACCEPTANCE !== "1") {
    throw new Error("Set QUESAR_BACKEND_ACCEPTANCE=1 for disposable local backend acceptance.");
  }
  const raw = process.env.QUESAR_ACCEPTANCE_ADMIN_URL;
  if (!raw)
    throw new Error("QUESAR_ACCEPTANCE_ADMIN_URL must name the disposable loopback server.");
  const url = new URL(raw);
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55471" ||
    url.pathname !== "/postgres" ||
    url.search ||
    url.password
  ) {
    throw new Error("Acceptance requires passwordless postgresql://127.0.0.1:55471/postgres.");
  }
  return url;
}

/**
 * The backend acceptance harnesses drove the retired Vite dev server and imported
 * source modules into the page (`import("/src/lib/….ts")`) to call server
 * functions, which Next.js does not serve. They stay refused until they are ported
 * to the Next server build (notes/superpowers/specs/2026-10-26-nextjs-app-router-port.md).
 */
export function assertHarnessPorted() {
  throw new Error(
    "Backend acceptance is not yet ported to the Next.js build; see notes/superpowers/specs/2026-10-26-nextjs-app-router-port.md.",
  );
}
