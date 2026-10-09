/**
 * Generate the standalone MLAI Research Sites artifact from canonical content.
 *
 * bun run export:research-site -- --output /absolute/site/source --generated-at 2026-09-24
 */
import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import katex from "katex";
import { research } from "../src/lib/mlai/categories/research";
import {
  researchContext,
  type ResearchContextCase,
} from "../src/lib/mlai/categories/research-context";
import {
  implementationStudyManifest,
  projectResearch,
  projectResearchContext,
  publicationManifest,
  researchDigest,
  RESEARCH_CANONICAL_ORIGIN,
  RESEARCH_EXPORT_VERSION,
  sha256,
} from "../src/lib/mlai/research-export";
import type { Research } from "../src/lib/mlai/schemas";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactName = "mlai-research-review-artifact";
const expectedPublicationCount = 21;
const expectedStudyCount = 7;
const args = process.argv.slice(2);

function argument(name: string): string | undefined {
  const positions = args.flatMap((arg, index) => (arg === name ? [index] : []));
  if (positions.length > 1) throw new Error(`Duplicate argument: ${name}`);
  if (!positions.length) return undefined;
  const value = args[positions[0] + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

for (let index = 0; index < args.length; index += 1) {
  if (args[index]?.startsWith("--")) {
    if (!["--output", "--generated-at"].includes(args[index] ?? "")) {
      throw new Error(`Unknown argument: ${args[index]}`);
    }
    index += 1;
  }
}

const destination = argument("--output");
if (!destination || !path.isAbsolute(destination)) {
  throw new Error("--output must name an existing absolute Sites project directory");
}
const generatedAtInput = argument("--generated-at");
if (!generatedAtInput || !Number.isFinite(Date.parse(generatedAtInput))) {
  throw new Error("--generated-at must be a fixed ISO date or timestamp");
}
const generatedAt = new Date(generatedAtInput).toISOString();
const requestedSiteRoot = path.resolve(destination);
const canonicalRepo = await realpath(
  execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
);

function overlaps(left: string, right: string): boolean {
  return (
    left === right ||
    left.startsWith(`${right}${path.sep}`) ||
    right.startsWith(`${left}${path.sep}`)
  );
}

if (!existsSync(requestedSiteRoot) || (await lstat(requestedSiteRoot)).isSymbolicLink()) {
  throw new Error("Output must be an existing, non-symlinked Sites project directory");
}
if (!(await lstat(requestedSiteRoot)).isDirectory()) {
  throw new Error("Output must be an existing Sites project directory");
}
const siteRoot = await realpath(requestedSiteRoot);
if (overlaps(siteRoot, canonicalRepo)) {
  throw new Error("Output must be outside the canonical repository");
}

const openaiPath = path.join(siteRoot, ".openai");
const openaiStat = await lstat(openaiPath).catch(() => undefined);
if (!openaiStat?.isDirectory() || openaiStat.isSymbolicLink()) {
  throw new Error("Sites project must contain a non-symlinked .openai directory");
}
const hostingConfigPath = path.join(openaiPath, "hosting.json");
const hostingConfigStat = await lstat(hostingConfigPath).catch(() => undefined);
if (!hostingConfigStat?.isFile() || hostingConfigStat.isSymbolicLink()) {
  throw new Error("Sites project must contain a regular .openai/hosting.json file");
}
const hostingConfig = JSON.parse(await readFile(hostingConfigPath, "utf8"));
if (hostingConfig.static?.directory !== "out") {
  throw new Error("Sites hosting configuration must use static.directory: out");
}

const rootEntries = await readdir(siteRoot);
const packagePath = path.join(siteRoot, "package.json");
const packageStat = await lstat(packagePath).catch(() => undefined);
if (packageStat?.isSymbolicLink() || (packageStat && !packageStat.isFile())) {
  throw new Error("Refusing a non-regular artifact package.json");
}
const owned = packageStat
  ? JSON.parse(await readFile(packagePath, "utf8")).name === artifactName
  : false;
if (!owned && rootEntries.some((name) => name !== ".openai")) {
  throw new Error("Refusing to modify an unrelated Sites project directory");
}

const published = path.join(siteRoot, "public");
const publishedStat = await lstat(published).catch(() => undefined);
if (publishedStat?.isSymbolicLink() || (publishedStat && !publishedStat.isDirectory())) {
  throw new Error("Refusing a symlinked or non-directory public output");
}
if (publishedStat) {
  if (!owned) throw new Error("Refusing to replace a public directory without artifact ownership");
  const priorManifestPath = path.join(published, "research-manifest.json");
  const priorManifestStat = await lstat(priorManifestPath).catch(() => undefined);
  if (!priorManifestStat?.isFile() || priorManifestStat.isSymbolicLink()) {
    throw new Error("Refusing to replace public output without its research manifest");
  }
  const priorManifest = JSON.parse(await readFile(priorManifestPath, "utf8"));
  if (
    priorManifest.format !== "mlai-research-review" ||
    ![1, RESEARCH_EXPORT_VERSION].includes(priorManifest.version)
  ) {
    throw new Error("Refusing to replace an unrelated public artifact");
  }
}

async function rejectSymlinks(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const stat = await lstat(fullPath);
    if (stat.isSymbolicLink()) throw new Error(`Refusing symlink in public output: ${fullPath}`);
    if (stat.isDirectory()) await rejectSymlinks(fullPath);
    else if (!stat.isFile()) throw new Error(`Refusing non-file in public output: ${fullPath}`);
  }
}
if (publishedStat) await rejectSymlinks(published);

const data = projectResearch(research);
const studies = projectResearchContext(researchContext, data);
if (
  data.publications.length !== expectedPublicationCount ||
  studies.length !== expectedStudyCount
) {
  throw new Error(
    `Unexpected canonical research corpus: ${data.publications.length} publications and ${studies.length} studies`,
  );
}
const legacyResearchNoteSlugs = [
  "wdbx-weighted-backtrace-memory-store",
  "sparse-evidence-attention-context-assembly",
  "wdbx-graph-weights-traceable-retrieval",
  "policy-locked-tool-use-multi-agent",
  "latency-budgets-real-time-orchestration",
  "backtrace-confidence-signals-hallucination",
  "vector-index-maintenance-continuous-ingestion",
  "human-approval-gates-operators-use",
  "chunk-provenance-long-context-retrieval",
  "offline-first-ai-sensitive-data",
  "prompt-injection-drills-agentic-systems",
  "multi-persona-routing-policy-weights",
];
const currentLegacyResearchNoteSlugs = data.publications
  .filter((publication) => publication.documentType === "research-note")
  .map((publication) => publication.slug);
if (
  JSON.stringify([...currentLegacyResearchNoteSlugs].sort()) !==
  JSON.stringify([...legacyResearchNoteSlugs].sort())
) {
  throw new Error("The canonical research corpus no longer contains all 12 legacy note slugs");
}

const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
if (!/^[a-f0-9]{40}$/.test(sourceRevision)) throw new Error("Invalid canonical source revision");
const sourceDirty = Boolean(
  execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim(),
);

const stage = await mkdtemp(path.join(siteRoot, ".research-export-"));
const output = path.join(stage, "public");
const assetsOutput = path.join(output, "assets");

async function writeText(filePath: string, value: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value);
}

async function copyCssAssets(cssFile: string, destinationName: string): Promise<void> {
  const sourceCss = await readFile(cssFile, "utf8");
  await writeText(path.join(assetsOutput, destinationName), sourceCss);
  const urls = [...sourceCss.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/g)];
  for (const [, , rawUrl] of urls) {
    if (!rawUrl || /^(?:data:|https?:)/i.test(rawUrl)) continue;
    const cleaned = rawUrl.split(/[?#]/, 1)[0] ?? "";
    const relative = cleaned.startsWith("/") ? cleaned.slice(1) : `assets/${cleaned}`;
    const normalized = path.posix.normalize(relative);
    if (!normalized.startsWith("assets/") || normalized.includes("../")) {
      throw new Error(`Unsafe local CSS asset path: ${rawUrl}`);
    }
    const filename = path.posix.basename(normalized);
    if (!/^[A-Za-z0-9._-]+$/.test(filename)) {
      throw new Error(`Unsupported CSS asset path: ${rawUrl}`);
    }
    const sourceAsset = path.join(root, "docs", normalized);
    const assetStat = await lstat(sourceAsset).catch(() => undefined);
    if (!assetStat?.isFile() || assetStat.isSymbolicLink()) {
      throw new Error(`Cannot resolve canonical CSS asset: ${rawUrl}`);
    }
    await cp(sourceAsset, path.join(assetsOutput, filename));
  }
}

function sectionId(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

type ArticleSection = {
  heading?: string;
  paragraphs: readonly string[];
  list?: readonly string[];
  math?: readonly string[];
  code?: readonly { lang?: string; file?: string; code: string }[];
  note?: string;
};

function articleBody(sections: readonly ArticleSection[]) {
  return (
    <div className="max-w-3xl space-y-10">
      {sections.map((section, index) => (
        <article key={`${section.heading ?? "block"}-${index}`}>
          {section.heading ? (
            <h2
              id={sectionId(section.heading)}
              className="scroll-mt-24 font-display text-[1.65rem] leading-tight tracking-tight text-fg"
            >
              {section.heading}
            </h2>
          ) : null}
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <p
              key={`${paragraph.slice(0, 48)}-${paragraphIndex}`}
              className="mt-4 max-w-[66ch] text-[1.0625rem] leading-8 text-fg"
            >
              {paragraph}
            </p>
          ))}
          {section.list?.length ? (
            <ul className="mt-5 max-w-[66ch] space-y-3">
              {section.list.map((item) => (
                <li key={item} className="flex gap-3 text-[1.0625rem] leading-8 text-fg">
                  <span
                    className="mt-3 size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {section.math?.map((tex) => (
            <div
              key={tex}
              className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/50 px-4 py-3 text-fg"
              tabIndex={0}
              role="region"
              aria-label="Equation"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(tex, {
                  displayMode: true,
                  throwOnError: true,
                  trust: false,
                  output: "htmlAndMathml",
                }),
              }}
            />
          ))}
          {section.code?.map((block, blockIndex) => (
            <div
              key={`${block.file ?? block.lang ?? "code"}-${blockIndex}`}
              className="mt-4 min-w-0 overflow-hidden rounded-lg bg-bg-elevated shadow-[var(--shadow-border)]"
            >
              <div className="border-b border-border px-4 py-2 text-xs text-fg-subtle">
                {block.file ?? block.lang ?? "source"}
              </div>
              <pre className="max-w-full overflow-x-auto p-5 font-mono text-[0.8rem] leading-7 text-fg">
                <code>{block.code}</code>
              </pre>
            </div>
          ))}
          {section.note ? (
            <p className="mt-5 max-w-[66ch] border-l-2 border-primary/50 bg-muted/50 px-4 py-3 text-base leading-7 text-fg">
              {section.note}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function contents(
  sections: readonly ArticleSection[],
  extra: readonly { id: string; label: string }[],
) {
  return (
    <aside className="surface h-fit p-5 lg:sticky lg:top-8">
      <nav aria-label="On this page" className="grid gap-3 text-sm">
        <strong className="text-fg">On this page</strong>
        {sections.map((section) =>
          section.heading ? (
            <a
              key={section.heading}
              href={`#${sectionId(section.heading)}`}
              className="text-fg-muted hover:text-fg"
            >
              {section.heading}
            </a>
          ) : null,
        )}
        {extra.map((item) => (
          <a key={item.id} href={`#${item.id}`} className="text-fg-muted hover:text-fg">
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function sourceCards(
  sources: readonly {
    title: string;
    url: string;
    revision: string;
    kind?: string;
    sha256?: string;
  }[],
) {
  if (!sources.length) {
    return (
      <p className="surface mt-3 p-4 text-sm leading-relaxed text-fg-muted">
        Public source citations are withheld because the underlying repository is private.
      </p>
    );
  }
  return (
    <ul className="mt-3 grid gap-3">
      {sources.map((source) => (
        <li key={`${source.url}-${source.title}`} className="surface p-4">
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-accent no-underline hover:underline"
          >
            {source.title}
          </a>
          <p className="mt-1 text-xs text-fg-muted">
            {source.kind ? `${source.kind} · ` : ""}revision{" "}
            <code className="break-all font-mono">{source.revision}</code>
          </p>
          {source.sha256 ? (
            <p className="mt-1 break-all font-mono text-[11px] text-fg-subtle">
              SHA-256: {source.sha256}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function attachmentCards(attachments: Research["publications"][number]["attachments"]) {
  if (!attachments.length) return null;
  return (
    <section id="downloads" className="mt-10">
      <h2 className="font-display text-2xl">Downloads</h2>
      <ul className="mt-3 grid gap-3">
        {attachments.map((attachment) => (
          <li key={attachment.url} className="surface p-4">
            <a
              href={attachment.url}
              download
              className="text-sm font-medium text-accent no-underline hover:underline"
            >
              {attachment.title} (PDF)
            </a>
            <p className="mt-1 text-xs text-fg-muted">
              {attachment.edition === "historical" ? "Historical edition" : "Current edition"} ·{" "}
              {attachment.date} · {attachment.pages} pages
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-fg-subtle">
              SHA-256: {attachment.sha256}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function shell(title: string, canonicalPath: string, content: ReactNode, description: string) {
  const html = renderToStaticMarkup(
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · MLAI Research`}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content={description} />
        <meta name="theme-color" content="#111410" />
        <link rel="canonical" href={`${RESEARCH_CANONICAL_ORIGIN}${canonicalPath}`} />
        <link rel="icon" href="/assets/mlai-mark.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/assets/lab.css" />
        <link rel="stylesheet" href="/assets/katex.min.css" />
        <script src="/assets/discovery.js" defer />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-border bg-bg-elevated">
          <div className="container mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-4">
            <a
              href="/research"
              className="flex items-center gap-3 font-display text-lg font-semibold text-fg no-underline"
            >
              <img src="/assets/mlai-mark.svg" width="32" height="32" alt="" />
              MLAI <span className="text-accent">Research</span>
            </a>
            <a
              href={`${RESEARCH_CANONICAL_ORIGIN}/research`}
              className="text-sm text-accent no-underline hover:underline"
            >
              Canonical research site ↗
            </a>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="container mx-auto max-w-6xl px-6 py-12 lg:py-16">
          {content}
        </main>
        <footer className="border-t border-border bg-bg-elevated">
          <div className="container mx-auto max-w-6xl px-6 py-8 text-sm text-fg-muted">
            MLAI Research · Practical ideas, inspectable evidence.
            <br />
            Generated {generatedAt.slice(0, 10)} from source revision{" "}
            <code className="font-mono">{sourceRevision.slice(0, 12)}</code>
            {sourceDirty ? " (working changes included)" : ""}.{" "}
            <a href="/research-manifest.json" className="text-accent">
              Inspect snapshot provenance
            </a>
            <br />
            <a href="/research#implementations" className="text-accent">
              Implementation studies
            </a>{" "}
            ·{" "}
            <a href="/research#collection" className="text-accent">
              Research collection
            </a>
          </div>
        </footer>
      </body>
    </html>,
  );
  return `<!doctype html>\n${html}`;
}

function documentCard(document: {
  slug: string;
  title: string;
  summary: string;
  kind: string;
  topics: readonly string[];
  href: string;
  kicker: string;
  searchText: string;
  meta?: string;
}) {
  return (
    <li
      key={`${document.kind}-${document.slug}`}
      data-research-item=""
      data-type={document.kind}
      data-topics={document.topics.join(" ")}
      data-search={document.searchText}
      className="min-w-0"
    >
      <a
        href={document.href}
        className="surface surface-hover block h-full p-5 text-fg no-underline"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
          <span>{document.kicker}</span>
          {document.meta ? <span>{document.meta}</span> : null}
        </div>
        <h3 className="mt-3 font-display text-xl">{document.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">{document.summary}</p>
      </a>
    </li>
  );
}

function renderIndex() {
  const documentItems = [
    ...data.publications.map((publication) =>
      documentCard({
        slug: publication.slug,
        title: publication.title,
        summary: publication.practicalSummary,
        kind: publication.documentType,
        topics: [publication.topic],
        href: `/research/${publication.slug}`,
        kicker: `${publication.documentType.replaceAll("-", " ")} · ${publication.status}`,
        searchText: `${publication.title} ${publication.abstract} ${publication.practicalSummary}`,
        meta: publication.readTime,
      }),
    ),
    ...studies.map((study) =>
      documentCard({
        slug: study.slug,
        title: study.title,
        summary: study.summary,
        kind: "implementation-study",
        topics: study.relatedTopics,
        href: `/research/implementations/${study.slug}`,
        kicker: `Implementation study · ${study.relatedTopics.join(" / ").toUpperCase()}`,
        searchText: `${study.title} ${study.summary} ${study.sections.flatMap((section) => section.paragraphs).join(" ")}`,
        meta: `${study.sources.length} sources`,
      }),
    ),
  ];
  const index = shell(
    "Research collection",
    "/research",
    <>
      <section className="mb-16 max-w-4xl">
        <p className="eyebrow">MLAI · Research</p>
        <h1 className="mt-4 font-display text-display">Ideas with their evidence attached.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-fg-muted">
          Six tracks, public notes, and nested implementation studies that pin claims to source.
          Citations stay on the page. Borrowed benchmarks do not.
        </p>
        <nav aria-label="Research sections" className="mt-8 flex flex-wrap gap-3 text-sm">
          <a href="#tracks" className="text-accent">
            Research tracks
          </a>
          <a href="#implementations" className="text-accent">
            Implementation studies
          </a>
          <a href="#collection" className="text-accent">
            Collection
          </a>
        </nav>
      </section>
      <section id="tracks" className="mb-16 scroll-mt-8">
        <p className="eyebrow">Tracks</p>
        <h2 className="mt-2 font-display text-3xl">Start from the subject, not a paper pile.</h2>
        <p className="mt-4 max-w-3xl text-fg-muted">
          Start with practical applications, then inspect the sources, implementation status, and
          limitations.
        </p>
        <ul className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.tracks.map((track) => (
            <li key={track.id}>
              <a
                href={`/research/${track.overviewSlug}`}
                className="surface surface-hover block h-full p-5 no-underline"
              >
                <p className="eyebrow">{track.id}</p>
                <h3 className="mt-2 font-display text-xl text-fg">{track.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{track.description}</p>
                <p className="mt-4 text-xs leading-relaxed text-fg-subtle">{track.availability}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section id="implementations" className="mb-16 scroll-mt-8">
        <p className="eyebrow">From research to systems</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Seven implementation studies.</h2>
            <p className="mt-3 max-w-3xl text-fg-muted">
              Each study identifies its source, operating boundaries, and connections to the
              research.
            </p>
          </div>
          <a href="/research/implementations" className="text-sm text-accent">
            Browse all implementations →
          </a>
        </div>
        <ul className="mt-7 grid gap-4 md:grid-cols-2">
          {studies.map((study) =>
            documentCard({
              slug: study.slug,
              title: study.title,
              summary: study.summary,
              kind: "implementation-study",
              topics: study.relatedTopics,
              href: `/research/implementations/${study.slug}`,
              kicker: `Implementation study · ${study.relatedTopics.join(" / ").toUpperCase()}`,
              searchText: `${study.title} ${study.summary}`,
              meta: `${study.sources.length} sources`,
            }),
          )}
        </ul>
      </section>
      <section id="collection" className="scroll-mt-8">
        <p className="eyebrow">Collection</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">All research documents.</h2>
            <p className="mt-3 text-fg-muted">
              {documentItems.length} publications and implementation studies.
            </p>
          </div>
        </div>
        <form
          id="research-filter"
          className="surface mt-7 grid gap-4 p-5 md:grid-cols-3"
          role="search"
        >
          <label className="grid gap-2 text-sm text-fg-muted">
            Search research
            <input
              id="research-query"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Memory, retrieval, agent policy…"
              className="min-h-11 rounded-md border border-input bg-background px-3 text-fg"
            />
          </label>
          <label className="grid gap-2 text-sm text-fg-muted">
            Research track
            <select
              id="research-topic"
              name="topic"
              className="min-h-11 rounded-md border border-input bg-background px-3 text-fg"
            >
              <option value="">All tracks</option>
              {data.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-fg-muted">
            Document type
            <select
              id="research-type"
              name="type"
              className="min-h-11 rounded-md border border-input bg-background px-3 text-fg"
            >
              <option value="">All documents</option>
              <option value="overview">Overview</option>
              <option value="research-note">Research note</option>
              <option value="implementation-guide">Implementation guide</option>
              <option value="implementation-study">Implementation study</option>
            </select>
          </label>
        </form>
        <p
          id="publication-status"
          role="status"
          aria-live="polite"
          className="mt-4 text-sm text-fg-muted"
        >
          {documentItems.length} research documents shown.
        </p>
        <ul id="research-documents" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documentItems}
        </ul>
      </section>
    </>,
    "MLAI research notes, implementation guides, and the sources behind systems for memory, agents, and local computing.",
  );
  return index;
}

function publicationPage(publication: Research["publications"][number], index: number): string {
  const next = data.publications[(index + 1) % data.publications.length];
  const relatedStudies = studies
    .filter((study) => study.relatedTopics.includes(publication.topic))
    .slice(0, 3);
  const siblings = data.publications
    .filter((item) => item.topic === publication.topic && item.slug !== publication.slug)
    .slice(0, 3);
  const page = shell(
    publication.title,
    `/research/${publication.slug}`,
    <article>
      <a href="/research" className="text-sm text-accent">
        ← All research
      </a>
      <header className="mt-8 max-w-4xl">
        <p className="eyebrow">
          {publication.tag} · {publication.status} · Reference snapshot
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
          {publication.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-fg-muted">{publication.abstract}</p>
        <p className="mt-5 font-mono text-xs tracking-wide text-fg-muted">
          {publication.authors ?? "MLAI Research"} · {publication.date} · {publication.readTime} ·{" "}
          {publication.documentType.replaceAll("-", " ")}
        </p>
      </header>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="surface p-5">
          <h2 className="text-xs font-medium text-accent">Practical summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            {publication.practicalSummary}
          </p>
        </section>
        <section className="surface p-5">
          <h2 className="text-xs font-medium text-accent">Status</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">{publication.statusNote}</p>
          <p className="mt-2 font-mono text-[11px] text-fg-subtle">
            Reviewed {publication.reviewedAt}
          </p>
        </section>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {contents(publication.body, [
          { id: "limitations", label: "Limitations" },
          { id: "evidence", label: "Supporting sources" },
          { id: "downloads", label: "Downloads" },
          { id: "related", label: "Related research" },
        ])}
        <div className="min-w-0">
          {articleBody(publication.body)}
          <section id="limitations" className="mt-10 scroll-mt-8">
            <h2 className="font-display text-2xl">Limitations</h2>
            <ul className="mt-3 grid gap-3">
              {publication.limitations.map((limitation) => (
                <li key={limitation} className="surface p-4 text-sm leading-relaxed text-fg-muted">
                  {limitation}
                </li>
              ))}
            </ul>
          </section>
          <section id="evidence" className="mt-10 scroll-mt-8">
            <h2 className="font-display text-2xl">Supporting sources</h2>
            {sourceCards(publication.sources)}
          </section>
          {attachmentCards(publication.attachments)}
          <section id="related" className="mt-12 scroll-mt-8">
            {siblings.length ? (
              <div>
                <h2 className="font-display text-xl">More on this track</h2>
                <ul className="mt-3 grid gap-2">
                  {siblings.map((item) => (
                    <li key={item.slug}>
                      <a href={`/research/${item.slug}`} className="text-sm text-accent">
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {relatedStudies.length ? (
              <div className="mt-8">
                <h2 className="font-display text-xl">Nested implementations</h2>
                <ul className="mt-3 grid gap-2">
                  {relatedStudies.map((study) => (
                    <li key={study.slug}>
                      <a
                        href={`/research/implementations/${study.slug}`}
                        className="text-sm text-accent"
                      >
                        {study.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
          {next && next.slug !== publication.slug ? (
            <p className="mt-14 border-t border-border pt-8 text-right">
              <span className="block text-xs text-fg-subtle">Next article</span>
              <a
                href={`/research/${next.slug}`}
                className="mt-1 font-display text-lg text-fg hover:underline"
              >
                {next.title}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </article>,
    publication.abstract,
  );
  return page;
}

function implementationIndexPage(): string {
  return shell(
    "Research implementations",
    "/research/implementations",
    <>
      <a href="/research#implementations" className="text-sm text-accent">
        ← Research
      </a>
      <header className="mt-8 max-w-4xl">
        <p className="eyebrow">Research · implementations</p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
          What the repositories actually contain.
        </h1>
        <p className="mt-5 text-lg leading-8 text-fg-muted">
          Seven nested readings. Each one stays inside a source revision and says what that source
          does not prove.
        </p>
      </header>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {studies.map((study) => (
          <li key={study.slug}>
            <a
              href={`/research/implementations/${study.slug}`}
              className="surface surface-hover block h-full p-5 no-underline"
            >
              <p className="eyebrow">
                {study.relatedTopics.join(" · ")} · {study.sources.length} sources
              </p>
              <h2 className="mt-3 font-display text-2xl text-fg">{study.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{study.summary}</p>
            </a>
          </li>
        ))}
      </ul>
    </>,
    "Nested MLAI implementation cases, each with pinned sources and explicit operating boundaries.",
  );
}

function implementationPage(study: ResearchContextCase): string {
  const relatedPublications = data.publications.filter(
    (publication) =>
      study.relatedTopics.includes(publication.topic) && publication.documentType === "overview",
  );
  return shell(
    study.title,
    `/research/implementations/${study.slug}`,
    <article>
      <a href="/research/implementations" className="text-sm text-accent">
        ← Implementation studies
      </a>
      <header className="mt-8 max-w-4xl">
        <p className="eyebrow">
          Research · implementation · {study.relatedTopics.join(" / ").toUpperCase()}
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
          {study.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-fg-muted">{study.summary}</p>
      </header>
      <div className="mt-10 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {contents(study.sections, [
          { id: "limitations", label: "Limitations" },
          { id: "sources", label: "Source evidence" },
          { id: "related-research", label: "Related research" },
        ])}
        <div className="min-w-0">
          {articleBody(study.sections)}
          <section id="limitations" className="mt-10 scroll-mt-8">
            <h2 className="font-display text-2xl">Limitations</h2>
            <ul className="mt-3 grid gap-3">
              {study.limitations.map((limitation) => (
                <li key={limitation} className="surface p-4 text-sm leading-relaxed text-fg-muted">
                  {limitation}
                </li>
              ))}
            </ul>
          </section>
          <section id="sources" className="mt-10 scroll-mt-8">
            <h2 className="font-display text-2xl">Source evidence</h2>
            {sourceCards(study.sources)}
          </section>
          <section id="related-research" className="mt-10 scroll-mt-8">
            <h2 className="font-display text-2xl">Related research</h2>
            <ul className="mt-3 grid gap-2">
              {relatedPublications.map((publication) => (
                <li key={publication.slug}>
                  <a href={`/research/${publication.slug}`} className="text-sm text-accent">
                    {publication.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </article>,
    study.summary,
  );
}

async function listFiles(directory: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const stat = await lstat(fullPath);
    if (stat.isSymbolicLink()) throw new Error(`Refusing symlink in generated output: ${fullPath}`);
    if (stat.isDirectory()) paths.push(...(await listFiles(fullPath)));
    else if (stat.isFile()) paths.push(fullPath);
    else throw new Error(`Refusing non-file in generated output: ${fullPath}`);
  }
  return paths.sort();
}

try {
  await mkdir(assetsOutput, { recursive: true });
  const docsAssets = path.join(root, "docs", "assets");
  const cssEntries = (await readdir(docsAssets)).filter((name) =>
    /^(styles|math)-[^/]+\.css$/.test(name),
  );
  const stylesheets = cssEntries.filter((name) => name.startsWith("styles-"));
  const mathStylesheets = cssEntries.filter((name) => name.startsWith("math-"));
  if (stylesheets.length !== 1 || mathStylesheets.length !== 1) {
    throw new Error("Expected exactly one canonical compiled stylesheet and KaTeX stylesheet");
  }
  await copyCssAssets(path.join(docsAssets, stylesheets[0]!), "lab.css");
  await copyCssAssets(path.join(docsAssets, mathStylesheets[0]!), "katex.min.css");
  await cp(
    path.join(root, "src", "cinematic", "design", "mlai-mark.svg"),
    path.join(assetsOutput, "mlai-mark.svg"),
  );
  const discovery = `(() => {
  const query = document.getElementById("research-query");
  const topic = document.getElementById("research-topic");
  const type = document.getElementById("research-type");
  const items = Array.from(document.querySelectorAll("#research-documents [data-research-item]"));
  const status = document.getElementById("publication-status");
  if (!query || !topic || !type || !status || items.length === 0) return;
  const update = () => {
    const search = query.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const item of items) {
      const searchText = (item.getAttribute("data-search") || "").toLocaleLowerCase();
      const topics = (item.getAttribute("data-topics") || "").split(/\\s+/);
      const matches = (!search || searchText.includes(search)) &&
        (!topic.value || topics.includes(topic.value)) &&
        (!type.value || item.getAttribute("data-type") === type.value);
      item.hidden = !matches;
      if (matches) visible += 1;
    }
    status.textContent = visible === 0
      ? "No research documents match those filters."
      : String(visible) + " of " + String(items.length) + " research documents shown.";
  };
  query.addEventListener("input", update);
  topic.addEventListener("change", update);
  type.addEventListener("change", update);
})();
`;
  await writeText(path.join(assetsOutput, "discovery.js"), discovery);
  // The Sites source tree's build step replaces this compatibility asset and its hash.
  await writeText(path.join(assetsOutput, "filter.js"), "(() => {})();\n");

  for (const publication of data.publications) {
    for (const attachment of publication.attachments) {
      const relative = attachment.url.slice(1);
      const attachmentPath = path.join(root, "public", ...relative.split("/"));
      const stat = await lstat(attachmentPath).catch(() => undefined);
      if (!stat?.isFile() || stat.isSymbolicLink()) {
        throw new Error(`Missing regular research attachment: ${attachment.url}`);
      }
      const bytes = await readFile(attachmentPath);
      if (sha256(bytes) !== attachment.sha256) {
        throw new Error(`Attachment digest mismatch: ${attachment.url}`);
      }
      const outputPath = path.join(output, ...relative.split("/"));
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, bytes);
    }
  }

  const page = renderIndex();
  await writeText(path.join(output, "index.html"), page);
  await writeText(path.join(output, "research", "index.html"), page);
  await writeText(
    path.join(output, "research", "implementations", "index.html"),
    implementationIndexPage(),
  );
  for (const [index, publication] of data.publications.entries()) {
    await writeText(
      path.join(output, "research", publication.slug, "index.html"),
      publicationPage(publication, index),
    );
  }
  for (const study of studies) {
    await writeText(
      path.join(output, "research", "implementations", study.slug, "index.html"),
      implementationPage(study),
    );
  }

  await writeText(
    path.join(output, "implementation-data.json"),
    `${JSON.stringify(studies, null, 2)}\n`,
  );
  await writeText(path.join(output, "research-data.json"), `${JSON.stringify(data, null, 2)}\n`);
  await writeText(path.join(output, "robots.txt"), "User-agent: *\nDisallow: /\n");
  await writeText(
    path.join(output, "404.html"),
    shell(
      "Page not found",
      "/research",
      <div className="max-w-3xl py-12">
        <p className="eyebrow">404 · Research snapshot</p>
        <h1 className="mt-3 font-display text-4xl">That research page is not here.</h1>
        <p className="mt-5">
          <a href="/research" className="text-accent">
            Browse the research collection
          </a>
        </p>
      </div>,
      "The requested research page is not in this snapshot.",
    ),
  );

  const hashes: Record<string, string> = {};
  for (const file of await listFiles(output)) {
    hashes[path.relative(output, file).split(path.sep).join("/")] = sha256(await readFile(file));
  }
  await writeText(
    path.join(output, "research-manifest.json"),
    `${JSON.stringify(
      {
        format: "mlai-research-review",
        version: RESEARCH_EXPORT_VERSION,
        sourceRevision,
        sourceDirty,
        generatedAt,
        canonicalOrigin: RESEARCH_CANONICAL_ORIGIN,
        contentSha256: researchDigest(data, studies),
        topics: data.tracks.map((track) => track.id),
        publications: publicationManifest(data),
        implementationStudies: implementationStudyManifest(data, studies),
        files: hashes,
      },
      null,
      2,
    )}\n`,
  );

  if (!owned) {
    await writeText(
      path.join(stage, "package.json"),
      `${JSON.stringify(
        {
          name: artifactName,
          private: true,
          type: "module",
          engines: { node: ">=24" },
          description:
            "Generated static artifact. Edit research source in the canonical MLAI repository; do not edit this snapshot.",
          scripts: { build: "node scripts/build-research-site.ts" },
        },
        null,
        2,
      )}\n`,
    );
    await writeText(
      path.join(stage, "scripts", "build-research-site.ts"),
      `import { cp, rm } from "node:fs/promises";\n\nawait rm("out", { recursive: true, force: true });\nawait cp("public", "out", { recursive: true });\n`,
    );
    await writeText(
      path.join(stage, "README.md"),
      `# MLAI Research review artifact\n\nGenerated from canonical MLAI source revision ${sourceRevision}. Edit the research records in the canonical repository and regenerate this directory.\n\nThe generated site is in public/. Run \`bun run build\` to copy those static files to out/, which is the directory declared in .openai/hosting.json. See public/research-manifest.json for source provenance, content digests, and emitted file hashes.\n`,
    );
  }

  const backup = path.join(stage, "previous-public");
  if (publishedStat) await rename(published, backup);
  const createdFiles: string[] = [];
  try {
    await rename(output, published);
    if (!owned) {
      for (const relative of ["package.json", "README.md", "scripts"]) {
        await rename(path.join(stage, relative), path.join(siteRoot, relative));
        createdFiles.push(path.join(siteRoot, relative));
      }
    }
  } catch (error) {
    for (const created of createdFiles.reverse())
      await rm(created, { recursive: true, force: true });
    if (existsSync(published)) await rm(published, { recursive: true, force: true });
    if (existsSync(backup)) await rename(backup, published);
    throw error;
  }
  console.log(
    `Exported ${data.publications.length} publications and ${studies.length} implementation studies to ${published}; content ${researchDigest(data, studies)}`,
  );
} finally {
  await rm(stage, { recursive: true, force: true });
}
