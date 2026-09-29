/**
 * Shared parsing for the content layer's human-readable date strings
 * ("June 9, 2026", "JUNE 2026"). Ported from mlai `src/lib/dates.ts`; used by
 * the RSS feed and the JSON-LD builders.
 */

/**
 * Returns ms-epoch at midnight UTC, or null when the string can't be parsed.
 *
 * A bare `Date.parse("June 9, 2026")` reads the date in the build machine's
 * time zone, so a build east of UTC published it as June 8. ISO dates
 * (`2026-09-23`) already parse as UTC; everything else is read with an
 * explicit UTC zone, so the feed, JSON-LD and sitemap agree wherever they
 * were built.
 */
export function parseContentDate(value: string): number | null {
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : `${value} UTC`);
  return Number.isNaN(t) ? null : t;
}

/** `parseContentDate` result as an ISO-8601 string, or undefined if unparseable. */
export function toIsoDate(value: string): string | undefined {
  const t = parseContentDate(value);
  return t === null ? undefined : new Date(t).toISOString();
}

/**
 * `parseContentDate` result as the `YYYY-MM-DD` form `<lastmod>` wants, or
 * undefined if unparseable. Undefined is a real answer: `<lastmod>` is
 * optional, and the sitemap omits it rather than stamping the build date on
 * pages that carry no date of their own (crawlers discount a `lastmod` that
 * changes on every build).
 */
export function toSitemapDate(value: string): string | undefined {
  return toIsoDate(value)?.slice(0, 10);
}
