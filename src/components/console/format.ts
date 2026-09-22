import type { AuditRecord } from "@/lib/console";

export function when(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function day(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/** Save a decrypted audit as JSON (mlai's export). The read was logged as `export`. */
export function downloadAudit(audit: AuditRecord): void {
  const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `quesar-audit-${audit.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Server functions throw only on unexpected failures (session expiry, network). */
export function unexpected(fallback: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/unauthori[sz]ed|sign in/i.test(message))
    return "Your session has expired. Sign in again to continue.";
  return fallback;
}
