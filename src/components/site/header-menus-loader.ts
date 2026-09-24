import { useEffect, useSyncExternalStore } from "react";

/**
 * The header's overlays (the "More" dropdown, the mobile sheet, the search
 * dialog and the theme toggle's tooltip) pull in the Radix menu, dialog,
 * tooltip and popper stack.
 * The header is on every page, so that code loads after hydration (on idle, or
 * on first hover, focus or tap) instead of riding in the root chunk. Until it
 * arrives, the header renders plain triggers with the same markup.
 */
type HeaderMenus = typeof import("./header-menus");

let menus: HeaderMenus | null = null;
const listeners = new Set<() => void>();

/** Marks a trigger whose keyboard focus moves to its replacement on the swap. */
export const TRIGGER_ATTR = "data-overlay-trigger";

let pending: Promise<HeaderMenus> | null = null;

/** sessionStorage flag: a stale-chunk reload was already tried in this tab. */
const RELOAD_KEY = "quesar:overlay-chunk-reload";

/**
 * The overlay chunk failed to load. After a republish replaces docs/, an open
 * tab still names the old hashed chunk, which now 404s: reload once to pick up
 * the new build. Offline, or after one reload, leave the page as is; the next
 * tap retries the import.
 */
function recoverFromChunkError() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    return;
  }
  window.location.reload();
}

export function loadHeaderMenus(): Promise<HeaderMenus> {
  if (menus) return Promise.resolve(menus);
  if (pending) return pending;
  pending = import("./header-menus").then(
    (mod) => {
      // The plain trigger unmounts in the swap; hand focus to its replacement.
      const focused = document.activeElement?.getAttribute(TRIGGER_ATTR) ?? null;
      menus = mod;
      for (const listener of listeners) listener();
      if (focused) {
        setTimeout(() => {
          // Only when focus was actually dropped: an overlay that opened in
          // the swap has already moved focus into itself.
          const active = document.activeElement;
          if (active && active !== document.body) return;
          document
            .querySelector<HTMLElement>(`[${TRIGGER_ATTR}="${CSS.escape(focused)}"]`)
            ?.focus();
        });
      }
      return mod;
    },
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );
  return pending;
}

/** Preload without caring about the result (idle, hover, focus). */
export function preloadHeaderMenus(): void {
  loadHeaderMenus().catch(() => {});
}

/**
 * What a plain trigger does on activation: open only once the real overlay
 * exists, so the button never reports aria-expanded="true" with nothing shown.
 */
export function openWhenLoaded(open: () => void): void {
  loadHeaderMenus().then(open, recoverFromChunkError);
}

/** Whether the overlays have loaded (for handlers outside React render). */
export function headerMenusLoaded(): boolean {
  return menus !== null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getMenus = () => menus;
const getServerMenus = () => null;

/** The loaded overlay components, or null (always null during SSR and hydration). */
export function useHeaderMenus(): HeaderMenus | null {
  return useSyncExternalStore(subscribe, getMenus, getServerMenus);
}

/** Load the overlays once the browser is idle after hydration. */
export function useLoadHeaderMenusWhenIdle(): void {
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(preloadHeaderMenus, { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(preloadHeaderMenus, 1500);
    return () => window.clearTimeout(handle);
  }, []);
}
