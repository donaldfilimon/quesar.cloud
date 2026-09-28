import { createElement, type ComponentType } from "react";
import catalogUrl from "virtual:search-catalog-url";
import type { SearchHit } from "@/lib/site-search";

/**
 * The search panel pulls in cmdk and reads the generated search catalog (a
 * JSON asset, `virtual:search-catalog-url`), so both load on first intent
 * (hover, focus, click or the shortcut) instead of riding in the root chunk.
 * Shared by the header trigger (`./search`), which only preloads, and the
 * dialog (`./search-dialog`), which renders the result.
 *
 * A failed load clears the cached promise so the next attempt starts fresh;
 * the build gives each panel import a fresh URL (scripts/search-retry-plugin.ts)
 * because browsers cache rejected dynamic imports by URL.
 */
export type SearchPanelProps = {
  query: string;
  setQuery: (value: string) => void;
  onSelect: (hit: SearchHit) => void;
};

let panelPromise: Promise<{ default: ComponentType<SearchPanelProps> }> | undefined;

export const loadSearchPanel = () =>
  (panelPromise ??= Promise.all([
    import("./search-panel"),
    fetch(catalogUrl, { signal: AbortSignal.timeout(10000) }).then(async (response) => {
      if (!response.ok) throw new Error("Search catalog unavailable");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid search catalog");
      return data as SearchHit[];
    }),
  ])
    .then(([module, catalog]) => ({
      default: function CatalogPanel(props: SearchPanelProps) {
        return createElement(module.SearchPanel, { ...props, catalog });
      },
    }))
    .catch((error: unknown) => {
      panelPromise = undefined;
      throw error;
    }));

/** Preload without caring about the result (hover, focus, the shortcut). */
export const preloadSearchPanel = () => {
  void loadSearchPanel().catch(() => {});
};

/** Drop a cached attempt so a retry fetches the panel and catalog again. */
export const resetSearchPanel = () => {
  panelPromise = undefined;
};
