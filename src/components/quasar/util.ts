// Non-component helpers shared by the Quasar screens (kept apart from the
// components so fast refresh keeps working).
import { useEffect, useState } from "react";
import { getBaseUrl, hydrateOrigin, setFallbackOrigin, subscribeOrigin } from "@/lib/quasar/api";
import { getQuasarDefaultOrigin } from "@/lib/quasar/config";

// Every Quasar screen reads the deployment default the same way: once, from the
// server, only when this device has no saved origin.
setFallbackOrigin(() => getQuasarDefaultOrigin());

/** The exact start commands, quoted from the service's own package and README. */
export const START_COMMANDS = {
  // `apps/quasar/packages/service/package.json` `start`: `bun run src/index.ts`.
  mlai: "bun run --filter '@quasar/service' start",
  // The same `start` script once WS H moves the service into this repository.
  sidecar: "bun run --cwd sidecars/quasar-service start",
} as const;

export function errorText(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  // The service answers failures as JSON (`{"error":"job running"}` or a zod
  // flatten); show its words rather than the envelope.
  try {
    const parsed = JSON.parse(raw) as {
      error?: unknown;
      formErrors?: string[];
      fieldErrors?: Record<string, string[]>;
    };
    if (typeof parsed.error === "string") return parsed.error;
    const fields = Object.entries(parsed.fieldErrors ?? {}).map(
      ([key, list]) => `${key}: ${list.join(", ")}`,
    );
    const all = [...(parsed.formErrors ?? []), ...fields];
    if (all.length) return all.join("; ");
  } catch {
    // Not JSON: use the message as is.
  }
  return raw;
}

/** A failure to reach the service at all, as opposed to the service refusing. */
export function isUnreachable(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch: network or CORS failure
  const message = error instanceof Error ? error.message : String(error);
  return /timed out|failed to fetch|load failed|networkerror/i.test(message);
}

/** The configured origin, or null until this device's setting has been read. */
export function useServiceOrigin(): string | null {
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const read = () => {
      if (live) setOrigin(getBaseUrl());
    };
    const stop = subscribeOrigin(read);
    hydrateOrigin().then(read, read);
    return () => {
      live = false;
      stop();
    };
  }, []);
  return origin;
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
