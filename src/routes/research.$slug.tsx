import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MathArticleBody } from "@/components/site/math-article";
import { AppLink } from "@/components/site/app-link";
import { Crumbs } from "@/components/site/crumbs";
import { ResearchSidebar } from "@/components/site/research-nav";
import { BulletSurface, PageClose, PageHero, Section, Surface } from "@/components/site";
import { productJourneys, research, researchContext } from "@/lib/mlai";
import { jsonLdScript, researchArticleLd } from "@/lib/mlai/structured-data";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/research/$slug")({
  beforeLoad: ({ params }) => {
    if (!research.publications.some((item) => item.slug === params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const paper = research.publications.find((item) => item.slug === params.slug);
    return {
      ...pageHead(`${paper?.title ?? "Research"} — MLAI`, paper?.abstract ?? "MLAI research note."),
      scripts: paper ? [jsonLdScript(researchArticleLd(paper))] : [],
    };
  },
  component: ResearchPaper,
});

function ResearchPaper() {
  const { slug } = Route.useParams();
  const index = research.publications.findIndex((item) => item.slug === slug);
  const paper = research.publications[index];
  if (!paper) throw notFound();
  const next = research.publications[(index + 1) % research.publications.length];
  const relatedProducts = productJourneys.filter((product) =>
    (product.researchSlugs as readonly string[]).includes(paper.slug),
  );
  return (
    <>
      <Crumbs
        items={
          paper.slug.endsWith("-overview")
            ? [
                { to: "/research", label: "Research" },
                { label: paper.title },
              ]
            : [
                { to: "/research", label: "Research" },
                {
                  to: `/research/${research.tracks.find((track) => track.id === paper.topic)?.overviewSlug ?? "ai-overview"}`,
                  label: paper.topic.toUpperCase(),
                },
                { label: paper.title },
              ]
        }
      />
      <PageHero
        eyebrow={`${paper.tag} · ${paper.status}`}
        title={paper.title}
        lede={paper.abstract}
        compact
      >
        <p className="mt-4 font-mono text-xs tracking-wide text-fg-muted">
          {paper.authors} · {paper.date} · {paper.readTime} · {paper.documentType.replaceAll("-", " ")}
        </p>
      </PageHero>
      <Section className="!pt-10">
        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <ResearchSidebar current={paper.slug} />
          <div>
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <Surface>
                <p className="text-xs text-accent">Practical summary</p>
                <p className="mt-2 text-sm text-fg-muted">{paper.practicalSummary}</p>
              </Surface>
              <Surface>
                <p className="text-xs text-accent">Status</p>
                <p className="mt-2 text-sm text-fg-muted">{paper.statusNote}</p>
                <p className="mt-2 font-mono text-[11px] text-fg-subtle">Reviewed {paper.reviewedAt}</p>
              </Surface>
            </div>
            <nav aria-label="Related products" className="mb-8 flex flex-wrap gap-4 text-sm">
              {relatedProducts.map((product) => (
                <Link key={product.slug} to="/products/$slug" params={{ slug: product.slug }} className="text-accent">
                  Explore {product.name}
                </Link>
              ))}
              <Link to="/products" className="text-accent">
                All products
              </Link>
            </nav>
            <MathArticleBody sections={paper.body} />
            <h3 className="mt-10 font-display text-xl">Limitations</h3>
            <div className="mt-3">
              <BulletSurface items={paper.limitations} />
            </div>
            <Evidence paper={paper} />
            <Related paper={paper} />
            <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-border pt-8">
              <Button asChild>
                <Link to="/contact">Work with our research team</Link>
              </Button>
              {next && next.slug !== paper.slug ? (
                <Link to="/research/$slug" params={{ slug: next.slug }} className="text-right no-underline">
                  <span className="block text-xs text-fg-subtle">
                    Next article
                  </span>
                  <span className="mt-1 block font-display text-lg text-fg hover:underline">{next.title}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/research", label: "Research index" }}
        next={[{ to: "/docs", label: "Docs", body: "Implementation notes for the same stack." }]}
      />
    </>
  );
}

function Related({ paper }: { paper: (typeof research.publications)[number] }) {
  const siblings = research.publications.filter((item) => item.topic === paper.topic && item.slug !== paper.slug).slice(0, 3);
  const cases = researchContext.filter((item) => item.relatedTopics.includes(paper.topic)).slice(0, 3);
  if (!siblings.length && !cases.length) return null;
  return (
    <div className="mt-12 grid gap-8">
      {siblings.length ? (
        <div>
          <h3 className="font-display text-xl">More on this track</h3>
          <ul className="mt-3 grid gap-3">
            {siblings.map((item) => (
              <li key={item.slug}>
                <Link to="/research/$slug" params={{ slug: item.slug }} className="text-sm text-accent no-underline hover:underline">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {cases.length ? (
        <div>
          <h3 className="font-display text-xl">Nested implementations</h3>
          <ul className="mt-3 grid gap-3">
            {cases.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/research/implementations/$slug"
                  params={{ slug: item.slug }}
                  className="text-sm text-accent no-underline hover:underline"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Sources with their revisions, and downloads with page counts and hashes (mlai ResearchArticleEvidence). */
function Evidence({ paper }: { paper: (typeof research.publications)[number] }) {
  return (
    <div className="mt-10 grid gap-8">
      <div>
        <h3 className="font-display text-xl">Supporting sources</h3>
        <ul className="mt-3 space-y-3">
          {paper.sources.map((source) => (
            <li key={`${source.url}-${source.title}`} className="surface p-4">
              <AppLink to={source.url} className="text-sm font-medium text-accent no-underline hover:underline">
                {source.title}
              </AppLink>
              <p className="mt-1 text-xs text-fg-muted">
                {source.kind} · revision <code className="break-all font-mono">{source.revision}</code>
              </p>
            </li>
          ))}
        </ul>
      </div>
      {paper.attachments.length ? (
        <div>
          <h3 className="font-display text-xl">Downloads</h3>
          <ul className="mt-3 space-y-3">
            {paper.attachments.map((attachment) => (
              <li key={attachment.url} className="surface p-4">
                <a href={attachment.url} download className="text-sm font-medium text-accent no-underline hover:underline">
                  {attachment.title} (PDF)
                </a>
                <p className="mt-1 text-xs text-fg-muted">
                  {attachment.edition === "historical" ? "Historical edition" : "Current edition"} · {attachment.date} ·{" "}
                  {attachment.pages} pages
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-fg-subtle">SHA-256: {attachment.sha256}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
