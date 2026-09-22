import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArticleBody, SourceChips } from "@/components/site/article";
import { Crumbs } from "@/components/site/crumbs";
import { ResearchSidebar } from "@/components/site/research-nav";
import { BulletSurface, PageClose, PageHero, Section, Surface } from "@/components/site";
import { research, researchContext } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/research/$slug")({
  beforeLoad: ({ params }) => {
    if (!research.publications.some((item) => item.slug === params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const paper = research.publications.find((item) => item.slug === params.slug);
    return pageHead(`${paper?.title ?? "Research"} — MLAI`, paper?.abstract ?? "MLAI research note.");
  },
  component: ResearchPaper,
});

function ResearchPaper() {
  const { slug } = Route.useParams();
  const paper = research.publications.find((item) => item.slug === slug);
  if (!paper) throw notFound();
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
        atmosphere="none"
        compact
      />
      <Section className="!pt-10">
        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <ResearchSidebar current={paper.slug} />
          <div>
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <Surface>
                <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">Practical summary</p>
                <p className="mt-2 text-sm text-fg-muted">{paper.practicalSummary}</p>
              </Surface>
              <Surface>
                <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">Status</p>
                <p className="mt-2 text-sm text-fg-muted">{paper.statusNote}</p>
                <p className="mt-2 font-mono text-[11px] text-fg-subtle">Reviewed {paper.reviewedAt}</p>
              </Surface>
            </div>
            <ArticleBody sections={paper.body} />
            <h3 className="mt-10 font-display text-xl">Limitations</h3>
            <div className="mt-3">
              <BulletSurface items={paper.limitations} />
            </div>
            <SourceChips sources={paper.sources.map((s) => ({ title: s.title, url: s.url, scope: s.kind }))} />
            <Related paper={paper} />
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
