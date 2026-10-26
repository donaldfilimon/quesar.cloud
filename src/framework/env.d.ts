/**
 * Build-time values the source reads through `import.meta.env`. `next.config.ts`
 * defines them (DefinePlugin) for each build mode; vitest supplies its defaults.
 */
interface ImportMetaEnv {
  /** "true" in the static GitHub Pages export. */
  readonly VITE_STATIC_SITE?: string;
  /** "false" turns sign-in off (the static export always does). */
  readonly VITE_AUTH_ENABLED?: string;
  /** "1" while capturing the narrated films. */
  readonly VITE_FILM_CAPTURE?: string;
  /** "static", "development", "production" or "persistent". */
  readonly MODE: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  /** Expanded at build time by scripts/next-transform.ts (and by vitest). */
  glob<T = unknown>(
    pattern: string,
    options?: { eager?: boolean; query?: string; import?: string },
  ): Record<string, T>;
}
