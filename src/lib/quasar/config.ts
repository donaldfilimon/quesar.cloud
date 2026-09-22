import { createServerFn } from "@tanstack/react-start";

/**
 * The deployment's default Quasar service origin (`QUASAR_SERVICE_ORIGIN`), or
 * null when unset or malformed. Not user data and not a secret: it is the same
 * value the browser would be told to call, so no auth middleware. The browser
 * falls back to `http://localhost:4700` when this is null.
 */
export const getQuasarDefaultOrigin = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    const { env } = await import("@/lib/env.server");
    const { normalizeOrigin } = await import("./connection");
    const raw = env("QUASAR_SERVICE_ORIGIN");
    if (!raw) return null;
    try {
      return normalizeOrigin(raw);
    } catch {
      return null;
    }
  },
);
