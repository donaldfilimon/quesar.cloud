export const SITE_ORIGIN = "https://quesar.cloud";

/**
 * Per-page head: title and description, mirrored into the Open Graph and
 * Twitter tags so shared links carry the page's own text. The root route sets
 * the site-wide defaults (image, card type, site name) and the canonical URL;
 * `image` (a site path, e.g. `ogImage("wdbx")`) replaces the default card.
 */
export function pageHead(title: string, description: string, image?: string) {
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
