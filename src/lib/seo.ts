export const SITE_ORIGIN = "https://quesar.cloud";

/**
 * Keep a meta description within `max` characters. Text that already fits is
 * returned unchanged; otherwise it is cut at the last whitespace at or before
 * `max - 1`, trailing punctuation and space are trimmed, and `…` is appended.
 */
export function clampDescription(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  // The cut is on a word boundary only when the next character is whitespace; otherwise back up.
  const lastSpace = cut.search(/\s\S*$/);
  const head = /\s/.test(text[max - 1] ?? "") || lastSpace <= 0 ? cut : cut.slice(0, lastSpace);
  return `${head.replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/**
 * Meta descriptions under `min` characters read as thin snippets. Extend one
 * with `extra`, which must be text from the same record, and leave it alone
 * when there is nothing to add or it is already long enough.
 */
export function extendDescription(base: string, extra: string | undefined, min = 70): string {
  if (base.length >= min || !extra) return base;
  return `${base} ${extra}`;
}

/** Brand short, brandless titles so a bare "Blog" reads as a result title. */
export function seoTitle(title: string): string {
  if (title.length < 30 && !title.includes("Quesar") && !title.includes("MLAI")) {
    return `${title} · Quesar`;
  }
  return title;
}

/**
 * Per-page head: title and description, mirrored into the Open Graph and
 * Twitter tags so shared links carry the page's own text. The root route sets
 * the site-wide defaults (image, card type, site name) and the canonical URL;
 * `image` (a site path, e.g. `ogImage("wdbx")`) replaces the default card.
 */
export function pageHead(rawTitle: string, rawDescription: string, image?: string) {
  const title = seoTitle(rawTitle);
  const description = clampDescription(rawDescription);
  const imageMeta = image
    ? [
        { property: "og:image", content: `${SITE_ORIGIN}${image}` },
        { name: "twitter:image", content: `${SITE_ORIGIN}${image}` },
      ]
    : [];
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...imageMeta,
    ],
  };
}

/** Absolute canonical URL for a router pathname (no trailing slash except the root). */
export function canonicalUrl(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  return `${SITE_ORIGIN}${path}`;
}
