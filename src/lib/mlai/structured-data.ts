/**
 * JSON-LD builders for the detail pages (`/blog/$slug`, `/research/$slug`,
 * `/team/$slug`, `/products/$slug`, `/docs/$slug`, `/projects/$slug`). Ported
 * from mlai `src/lib/structured-data.ts`.
 *
 * Each builder returns a ready-to-stringify object; routes emit it through
 * `jsonLdScript()` in their `head().scripts`, so it lands in `<head>` during
 * SSR. These describe the page's *subject* (schema.org), not the social card.
 *
 * Bylines in the content layer are team names ("MLAI Research · WDBX Core"),
 * not people, so they are split on either separator and emitted as
 * `Organization`. There is deliberately no person-vs-organization heuristic.
 *
 * `docLd` emits no dates because `Doc` carries none: synthesizing one would
 * publish a fabricated date as structured data.
 */

import { bylineNames } from "./byline";
import { toIsoDate } from "./dates";
import type { Blog, Doc, Products, Project, Research, Team } from "./schemas";

/** Canonical origin. Matches the root route's canonical link and research exports. */
export const SITE_URL = "https://quesar.cloud";

type BlogPost = Blog[number];
type ResearchPub = Research["publications"][number];
type TeamMember = Team[number];
type Product = Products[number];

export const ORG_REF = {
  "@type": "Organization" as const,
  name: "MLAI Corporation",
  url: SITE_URL,
  logo: `${SITE_URL}/__grok/icon-180.png`,
};

function bylineOrganizations(byline: string | undefined) {
  const names = bylineNames(byline);
  return names.length ? names.map((name) => ({ "@type": "Organization" as const, name })) : null;
}

export function blogPostingLd(post: BlogPost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const iso = toIsoDate(post.date);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    mainEntityOfPage: url,
    headline: post.title,
    description: post.excerpt,
    url,
    ...(iso ? { datePublished: iso, dateModified: iso } : {}),
    author: bylineOrganizations(post.author) ?? ORG_REF,
    publisher: ORG_REF,
    keywords: post.tag,
  };
}

export function researchArticleLd(paper: ResearchPub) {
  const url = `${SITE_URL}/research/${paper.slug}`;
  const iso = toIsoDate(paper.date);
  return {
    "@context": "https://schema.org",
    "@type": paper.documentType === "research-note" ? "ScholarlyArticle" : "TechArticle",
    "@id": url,
    mainEntityOfPage: url,
    headline: paper.title,
    abstract: paper.abstract,
    description: paper.abstract,
    url,
    ...(iso ? { datePublished: iso } : {}),
    dateModified: toIsoDate(paper.reviewedAt),
    citation: paper.sources.map((source) => source.url),
    author: bylineOrganizations(paper.authors) ?? ORG_REF,
    publisher: ORG_REF,
    keywords: paper.tag,
  };
}

export function personLd(member: TeamMember) {
  const url = member.slug ? `${SITE_URL}/team/${member.slug}` : undefined;
  const sameAs = [
    member.socials?.github ? `https://github.com/${member.socials.github}` : null,
    member.socials?.x ? `https://x.com/${member.socials.x}` : null,
    member.socials?.web
      ? member.socials.web.startsWith("http")
        ? member.socials.web
        : `https://${member.socials.web}`
      : null,
  ].filter((v): v is string => v !== null);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    ...(url ? { "@id": url, mainEntityOfPage: url, url } : {}),
    name: member.name,
    jobTitle: member.role,
    description: member.tagline ?? member.bio,
    image: member.image,
    ...(member.location ? { homeLocation: { "@type": "Place", name: member.location } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    worksFor: ORG_REF,
  };
}

export function softwareApplicationLd(product: Product) {
  const url = `${SITE_URL}/products/${product.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": url,
    mainEntityOfPage: url,
    name: product.name,
    description: product.intro,
    url,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: product.kicker,
    operatingSystem: "Cross-platform",
    publisher: ORG_REF,
  };
}

export function docLd(doc: Doc) {
  const url = `${SITE_URL}/docs/${doc.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": url,
    mainEntityOfPage: url,
    headline: doc.title,
    description: doc.description,
    url,
    citation: doc.sources.map((source) => source.url),
    author: ORG_REF,
    publisher: ORG_REF,
    keywords: doc.group,
  };
}

/** `SoftwareSourceCode`: every project record describes a source repository, not a distributable app. */
export function projectLd(project: Project) {
  const url = `${SITE_URL}/projects/${project.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "@id": url,
    mainEntityOfPage: url,
    name: project.name,
    description: project.description,
    url,
    codeRepository: project.source.url,
    publisher: ORG_REF,
  };
}

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

/** A head `scripts` entry for TanStack Router. */
export function jsonLdScript(value: unknown) {
  return { type: "application/ld+json", children: serializeJsonLd(value) };
}
