/**
 * Privacy-respecting, first-party telemetry client (ported from mlai
 * `src/lib/telemetry.ts`, plus route-change page views).
 *
 * - Allowlisted event names only; the server allowlists the path too.
 * - No identifiers: no cookie, no user id, no fingerprint. The server stores
 *   event + pathname + timestamp and nothing else.
 * - Honors Do Not Track / Global Privacy Control before any request is made.
 * - Fire-and-forget: a failed beacon never affects the user-facing flow.
 *
 * Mount `usePageViewTelemetry()` once in the root component to record page
 * views on every route change.
 */
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export type TelemetryEvent = "page_view" | "inquiry_open" | "inquiry_submit" | "inquiry_success" | "inquiry_close";

/** doNotTrack is "1" in Chromium; older Firefox/Safari report "yes". Honor both, plus GPC. */
export function optedOut(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.doNotTrack === "yes" || nav.globalPrivacyControl === true;
}

export function track(event: TelemetryEvent, path?: string): void {
  if (optedOut()) return;
  try {
    const payload = JSON.stringify({ event, path: path ?? window.location.pathname });
    // sendBeacon survives page unloads and never blocks; fall back to a
    // keepalive fetch where beacons are unavailable.
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/telemetry", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Telemetry is best-effort by design.
  }
}

/** Send one `page_view` per distinct pathname the router settles on. */
export function usePageViewTelemetry(): void {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    track("page_view", pathname);
  }, [pathname]);
}
