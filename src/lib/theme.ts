export const THEME_KEY = "mlai-theme";
export type Theme = "dark" | "light";

export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "dark" || value === "light") return value;
  } catch {
    /* private mode */
  }
  return null;
}

const themeListeners = new Set<() => void>();

/** Subscribe to `applyTheme` calls (for `useSyncExternalStore`). */
export function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode */
  }
  for (const listener of themeListeners) listener();
}

/**
 * The theme the page is showing: the one the boot script or `applyTheme` put on
 * `<html data-theme>`, else the stored/system preference. Client only.
 */
export function currentTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  if (applied === "dark" || applied === "light") return applied;
  return resolveTheme();
}

export function resolveTheme(): Theme {
  return readStoredTheme() ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}
