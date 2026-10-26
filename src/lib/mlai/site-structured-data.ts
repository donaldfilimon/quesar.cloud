/**
 * Site-wide JSON-LD: the WebSite/Organization graph every page carries and the
 * per-page BreadcrumbList. Kept apart from `structured-data.ts` (detail-page
 * builders that import content types) because the shared head imports this
 * module, so it may pull in only `site-identity` and `seo`.
 */

import { SITE_ORIGIN } from "@/lib/seo";
import { nav, site } from "@/lib/site-identity";

/** Canonical origin. Matches the root route's canonical link and research exports. */
export const SITE_URL = SITE_ORIGIN;

/**
 * Serialize for an inline `<script type="application/ld+json">`.
 * `JSON.stringify` does not escape `<`, so a `</script>` inside content would
 * close the tag early; U+2028/2029 are legal JSON but not legal in older JS
 * parsers. All three become `\u` escapes, which JSON parsers read back unchanged.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** A head `scripts` entry. */
export function jsonLdScript(value: unknown) {
  return { type: "application/ld+json", children: serializeJsonLd(value) };
}

const WEBSITE_ID = `${SITE_URL}/#website`;
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** WebSite plus Organization, linked by `@id`. No SearchAction: the site has no search URL. */
export function siteGraphLd() {
  return {
    "@context": "https://schema.org" as const,
    "@graph": [
      {
        "@type": "WebSite" as const,
        "@id": WEBSITE_ID,
        url: `${SITE_URL}/`,
        name: site.name,
        description: site.description,
        inLanguage: "en",
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "Organization" as const,
        "@id": ORGANIZATION_ID,
        name: site.company,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/apple-touch-icon.png`,
        email: site.contact.email,
        telephone: site.contact.phoneInternational,
        description: site.mission,
        sameAs: [
          "https://github.com/donaldfilimon/quesar.cloud",
          "https://github.com/donaldfilimon/abi",
          "https://github.com/donaldfilimon/wdbx",
          "https://github.com/donaldfilimon/abbey",
          "https://github.com/donaldfilimon/skill-creator",
          "https://github.com/donaldfilimon/gama",
        ],
      },
    ],
  };
}

/**
 * Drop a trailing brand suffix (` · Quesar`, ` — Quesar`, ` | Quesar`, ` — MLAI`,
 * `: Quesar…`) from a page title; any other title is returned whole.
 */
export function stripBrandSuffix(title: string): string {
  const stripped = title.replace(/(?:\s+[·—|]\s+(?:Quesar|MLAI)|:\s+Quesar\b.*)$/, "").trim();
  return stripped || title;
}

const titleCase = (segment: string) =>
  segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** BreadcrumbList for a page path, or null for the home page. Trailing slashes are ignored. */
export function breadcrumbLd(pathname: string, pageTitle: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const crumbs = [{ name: "Home", url: `${SITE_URL}/` }];
  segments.forEach((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join("/")}`;
    const last = index === segments.length - 1;
    const label = last
      ? stripBrandSuffix(pageTitle)
      : (nav.find((item) => item.to === path)?.label ?? titleCase(segment));
    crumbs.push({ name: label, url: `${SITE_URL}${path}` });
  });
  return {
    "@context": "https://schema.org" as const,
    "@type": "BreadcrumbList" as const,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
