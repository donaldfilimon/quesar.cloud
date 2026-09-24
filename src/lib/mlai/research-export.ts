/** Stable public research projection shared by exports and equivalence checks. */
import { createHash } from "node:crypto";
import type { ResearchContextCase } from "./categories/research-context";
import { ResearchSchema, type Research } from "./schemas";

export const RESEARCH_EXPORT_VERSION = 2;
export const RESEARCH_CANONICAL_ORIGIN = "https://quesar.cloud";

// Reviewed against GitHub repository metadata before publication. New GitHub
// citation targets must be confirmed public and added here before export.
const PUBLIC_GITHUB_REPOSITORIES = new Set([
  "donaldfilimon/abi",
  "donaldfilimon/abbey",
  "donaldfilimon/gama",
  "donaldfilimon/mlai-corporation-www",
  "donaldfilimon/mlai-website-app",
  "donaldfilimon/nyon-game",
  "donaldfilimon/wdbx",
  "donaldfilimon/wdbx_python",
]);

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function validatePublicSourceUrl(urlValue: string, revision: string, slug: string): void {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error(`Invalid public citation URL: ${slug}`);
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (
    url.protocol !== "https:" ||
    url.port !== "" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.hostname !== "github.com" ||
    parts.length < 5 ||
    !PUBLIC_GITHUB_REPOSITORIES.has(`${parts[0]}/${parts[1]}`.toLowerCase()) ||
    parts[2] !== "blob" ||
    parts[3] !== revision ||
    !parts.slice(4).length
  ) {
    throw new Error(
      `Research citation must use a revision-pinned URL from a reviewed public GitHub repository: ${slug}`,
    );
  }
}

function validSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function projectResearch(input: Research): Research {
  const data = ResearchSchema.parse(input);
  const slugs = new Set<string>();
  for (const publication of data.publications) {
    if (!validSlug(publication.slug) || slugs.has(publication.slug)) {
      throw new Error(`Invalid or duplicate research slug: ${publication.slug}`);
    }
    slugs.add(publication.slug);
    if (!publication.sources.length) {
      throw new Error(`Research publication has no source provenance: ${publication.slug}`);
    }
    for (const source of publication.sources) {
      if (!source.title.trim() || !/^[a-f0-9]{40}$/.test(source.revision)) {
        throw new Error(`Incomplete research source provenance: ${publication.slug}`);
      }
      validatePublicSourceUrl(source.url, source.revision, publication.slug);
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

export function projectResearchContext(
  input: readonly ResearchContextCase[],
  data: Research,
): ResearchContextCase[] {
  const knownTopics = new Set(data.tracks.map((track) => track.id));
  const slugs = new Set<string>();
  const publications = new Set(data.publications.map((publication) => publication.slug));
  return input.map((study) => {
    const sourceAvailability = study.sourceAvailability ?? "public";
    if (!validSlug(study.slug) || slugs.has(study.slug) || publications.has(study.slug)) {
      throw new Error(`Invalid or duplicate implementation study slug: ${study.slug}`);
    }
    slugs.add(study.slug);
    const withheldSourceDisclosure = study.limitations.some(
      (limitation) => /citations are withheld/i.test(limitation) && /private/i.test(limitation),
    );
    if (
      !study.title.trim() ||
      !study.summary.trim() ||
      !study.relatedTopics.length ||
      study.relatedTopics.some((topic) => !knownTopics.has(topic)) ||
      !study.sections.length ||
      !study.limitations.length ||
      !["public", "withheld"].includes(sourceAvailability) ||
      (sourceAvailability === "public" && !study.sources.length) ||
      (sourceAvailability === "withheld" && study.sources.length > 0) ||
      (sourceAvailability === "withheld" && !withheldSourceDisclosure)
    ) {
      throw new Error(`Incomplete implementation study provenance or content: ${study.slug}`);
    }
    for (const section of study.sections) {
      if (
        (section.heading !== undefined && !section.heading.trim()) ||
        !section.paragraphs.length ||
        section.paragraphs.some((paragraph) => !paragraph.trim())
      ) {
        throw new Error(`Malformed implementation study section: ${study.slug}`);
      }
    }
    for (const source of study.sources) {
      if (
        !source.title.trim() ||
        !/^[a-f0-9]{40}$/.test(source.revision) ||
        !/^[a-f0-9]{64}$/.test(source.sha256)
      ) {
        throw new Error(`Incomplete implementation study source provenance: ${study.slug}`);
      }
      validatePublicSourceUrl(source.url, source.revision, study.slug);
    }
    return study;
  });
}

export function researchDigest(data: Research, studies?: readonly ResearchContextCase[]): string {
  const projected = projectResearch(data);
  if (!studies) return sha256(JSON.stringify(projected));
  const projectedStudies = projectResearchContext(studies, projected);
  return sha256(JSON.stringify({ research: projected, implementationStudies: projectedStudies }));
}

export function publicationManifest(data: Research) {
  return projectResearch(data).publications.map((publication) => ({
    slug: publication.slug,
    canonicalUrl: `${RESEARCH_CANONICAL_ORIGIN}/research/${publication.slug}`,
    contentSha256: sha256(JSON.stringify(publication)),
    sourceCount: publication.sources.length,
    sources: publication.sources.map(({ title, url, revision, kind }) => ({
      title,
      url,
      revision,
      kind,
    })),
    attachments: publication.attachments.map(({ url, sha256: hash }) => ({ url, sha256: hash })),
  }));
}

export function implementationStudyManifest(data: Research, input: readonly ResearchContextCase[]) {
  return projectResearchContext(input, data).map((study) => ({
    slug: study.slug,
    canonicalUrl: `${RESEARCH_CANONICAL_ORIGIN}/research/implementations/${study.slug}`,
    contentSha256: sha256(JSON.stringify(study)),
    sourceAvailability: study.sourceAvailability ?? "public",
    sourceCount: study.sources.length,
    sources: study.sources.map(({ title, url, revision, sha256: digest }) => ({
      title,
      url,
      revision,
      sha256: digest,
    })),
  }));
}
