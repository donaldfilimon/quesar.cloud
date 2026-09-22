/**
 * Stable public research projection shared by exports and equivalence checks.
 * Ported from mlai `src/lib/research-export.ts`.
 *
 * Server/test only: it uses `node:crypto`, so never import it from a route
 * component or anything that reaches the client bundle. mlai's owner-private
 * `scripts/export-research.tsx` (which writes a static site to disk) is not
 * ported; this module is the validation and manifest half it relied on.
 */
import { createHash } from "node:crypto";
import { ResearchSchema, type Research } from "./schemas";

export const RESEARCH_EXPORT_VERSION = 1;
export const RESEARCH_CANONICAL_ORIGIN = "https://quesar.cloud";

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function projectResearch(input: Research): Research {
  const data = ResearchSchema.parse(input);
  const slugs = new Set<string>();
  for (const publication of data.publications) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publication.slug) || slugs.has(publication.slug)) {
      throw new Error(`Invalid or duplicate research slug: ${publication.slug}`);
    }
    slugs.add(publication.slug);
    for (const source of publication.sources) {
      if (!source.url.startsWith("https://") || /localhost|127\.0\.0\.1/.test(source.url)) {
        throw new Error(`Research citation must be a public HTTPS reference: ${publication.slug}`);
      }
    }
    for (const attachment of publication.attachments) {
      if (!/^\/research\/[a-z0-9][a-z0-9.-]*\.pdf$/.test(attachment.url)) {
        throw new Error(`Unsafe attachment path: ${publication.slug}`);
      }
    }
  }
  for (const track of data.tracks) {
    if (!slugs.has(track.overviewSlug)) throw new Error(`Missing overview for ${track.id}`);
  }
  return data;
}

export function researchDigest(data: Research): string {
  return sha256(JSON.stringify(projectResearch(data)));
}

export function publicationManifest(data: Research) {
  return projectResearch(data).publications.map((publication) => ({
    slug: publication.slug,
    canonicalUrl: `${RESEARCH_CANONICAL_ORIGIN}/research/${publication.slug}`,
    contentSha256: sha256(JSON.stringify(publication)),
    sourceCount: publication.sources.length,
    attachments: publication.attachments.map(({ url, sha256: hash }) => ({ url, sha256: hash })),
  }));
}
