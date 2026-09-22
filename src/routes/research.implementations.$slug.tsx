import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleBody, SourceChips } from "@/components/site/article";
import { Crumbs } from "@/components/site/crumbs";
import { ResearchSidebar } from "@/components/site/research-nav";
import { BulletSurface, ChipRow, PageClose, PageHero, Pager, Section } from "@/components/site";
import { researchContext } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/research/implementations/$slug")({
  beforeLoad: ({ params }) => {
    if (!researchContext.some((item) => item.slug === params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const item = researchContext.find((entry) => entry.slug === params.slug);
    return pageHead(`${item?.title ?? "Implementation"} — MLAI research`, item?.summary ?? "MLAI implementation case.");
  },
  component: ImplementationPage,
});

function ImplementationPage() {
  const { slug } = Route.useParams();
  const index = researchContext.findIndex((item) => item.slug === slug);
  const item = researchContext[index];
  if (!item) throw notFound();
  const prev = index > 0 ? researchContext[index - 1] : undefined;
  const next = index < researchContext.length - 1 ? researchContext[index + 1] : undefined;

  return (
    <>
      <Crumbs
        items={[
          { to: "/research", label: "Research" },
          { to: "/research/implementations", label: "Implementations" },
          { label: item.title },
        ]}
      />
      <PageHero eyebrow="Research · implementation" title={item.title} lede={item.summary} atmosphere="none" compact />
      <Section className="!pt-10">
        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <ResearchSidebar current={item.slug} />
          <div>
        <ChipRow items={item.relatedTopics.map((topic) => topic.toUpperCase())} />
        <div className="mt-8">
          <ArticleBody sections={item.sections} />
        </div>
        <h3 className="mt-10 font-display text-xl">Limitations</h3>
        <div className="mt-3">
          <BulletSurface items={item.limitations} />
        </div>
        <SourceChips sources={item.sources.map((source) => ({ title: source.title, url: source.url, scope: source.revision }))} />
        <Pager
          index={{ to: "/research/implementations", label: "All implementations" }}
          prev={prev ? { to: `/research/implementations/${prev.slug}`, label: prev.title } : undefined}
          next={next ? { to: `/research/implementations/${next.slug}`, label: next.title } : undefined}
        />
          </div>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/research", label: "Research index" }}
        next={item.relatedTopics.slice(0, 1).map((topic) => {
          const overview = {
            ai: "ai-overview",
            wdbx: "wdbx-overview",
            sea: "sea-overview",
            gpu: "gpu-overview",
            mcp: "mcp-overview",
            tui: "tui-overview",
          }[topic];
          return { to: `/research/${overview}`, label: `${topic.toUpperCase()} overview`, body: "The track note this case sits under." };
        })}
      />
    </>
  );
}
