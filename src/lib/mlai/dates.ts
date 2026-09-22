/**
 * Shared parsing for the content layer's human-readable date strings
 * ("June 9, 2026", "JUNE 2026"). Ported from mlai `src/lib/dates.ts`; used by
 * the RSS feed and the JSON-LD builders.
 */

/** Returns ms-epoch, or null when the string can't be parsed as a date. */
export function parseContentDate(value: string): number | null {
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** `parseContentDate` result as an ISO-8601 string, or undefined if unparseable. */
export function toIsoDate(value: string): string | undefined {
  const t = parseContentDate(value);
  return t === null ? undefined : new Date(t).toISOString();
}

/**
 * `parseContentDate` result as the `YYYY-MM-DD` form `<lastmod>` wants, or
 * undefined if unparseable.
 *
 * Undefined is a real answer here, not a failure to handle: `<lastmod>` is
 * optional in the sitemap protocol, and the generator omits the element rather
 * than substituting the build date. It used to stamp `new Date()` on all ~50
 * URLs, which meant every `bun run build` dirtied `public/sitemap.xml` and told
 * crawlers the entire site changed today, every day — and Google discounts a
 * `lastmod` it decides is unreliable, so the noise cost the signal for the
 * handful of pages that genuinely had changed. Only blog posts and research
 * publications carry a date in the content layer; static marketing pages,
 * products, and team profiles do not, and inventing one for them would
 * reintroduce exactly the unreliability this avoids.
 */
export function toSitemapDate(value: string): string | undefined {
  return toIsoDate(value)?.slice(0, 10);
}
