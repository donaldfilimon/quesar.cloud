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
  // ISO forms (with or without a time) and strings naming their own zone parse
  // as written; only a bare human date gets the explicit UTC zone.
  const zoned = /^\d{4}-\d{2}-\d{2}/.test(value) || /\b(UTC|GMT)\b|[+-]\d{2}:?\d{2}$/.test(value);
  const t = Date.parse(zoned ? value : `${value} UTC`);
  return Number.isNaN(t) ? null : t;
}

/** `parseContentDate` result as an ISO-8601 string, or undefined if unparseable. */
export function toIsoDate(value: string): string | undefined {
  const t = parseContentDate(value);
  return t === null ? undefined : new Date(t).toISOString();
}
