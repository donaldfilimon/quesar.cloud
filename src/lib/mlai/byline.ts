/**
 * Shared parsing for the content layer's byline strings. Ported from mlai
 * `src/lib/byline.ts`.
 *
 * Multi-team bylines are separated with a MIDDLE DOT, not a comma
 * (`"MLAI Research · WDBX Core"`). Both separators are accepted, because a comma
 * is what a future editor is most likely to reach for.
 */

/** Byline split into its individual names. Empty array when there is nothing to split. */
export function bylineNames(byline: string | undefined | null): string[] {
  return (byline ?? "")
    .split(/[,·]/)
    .map((name) => name.trim())
    .filter(Boolean);
}
