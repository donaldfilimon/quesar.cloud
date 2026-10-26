/**
 * Stand-in for server-only modules (`*.server.ts`, `@/lib/db`, `@/lib/server/*`)
 * in the Next.js static build. They are reachable only from server-function
 * handlers, which this build never runs (./start.ts), so nothing here is called;
 * the stub keeps PGLite, node:crypto and friends out of the bundles.
 */
function unavailable(): never {
  throw new Error("Server-only module: not available in the Next.js static build.");
}

export const getSql = unavailable;
export const ensureDbReady = unavailable;
export const env = new Proxy({}, { get: unavailable });
export default unavailable;
