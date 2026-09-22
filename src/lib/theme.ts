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

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function resolveTheme(): Theme {
  return readStoredTheme() ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}
