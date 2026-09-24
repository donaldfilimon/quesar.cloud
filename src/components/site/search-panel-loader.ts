/**
 * The search catalog indexes every content dataset and pulls in cmdk, so the
 * panel loads on first intent (hover, focus, click or the shortcut) instead of
 * riding in the root chunk. Shared by the header trigger (`./search`), which
 * only preloads it, and the dialog (`./search-dialog`), which renders it.
 */
export const loadSearchPanel = () => import("./search-panel");
