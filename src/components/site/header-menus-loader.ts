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
let loading = false;
const listeners = new Set<() => void>();

/** Marks a trigger whose keyboard focus moves to its replacement on the swap. */
export const TRIGGER_ATTR = "data-overlay-trigger";

export function loadHeaderMenus(): void {
  if (menus || loading) return;
  loading = true;
  import("./header-menus").then(
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
    },
    () => {
      loading = false;
    },
  );
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
      const handle = window.requestIdleCallback(() => loadHeaderMenus(), { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(loadHeaderMenus, 1500);
    return () => window.clearTimeout(handle);
  }, []);
}
