import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleBody, SourceChips } from "@/components/site/article";
import { DocOutline, DocSidebar } from "@/components/site/doc-nav";
import { Crumbs } from "@/components/site/crumbs";
import { PageClose, PageHero, Pager, Section } from "@/components/site";
import { docs } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/docs/$slug")({
  beforeLoad: ({ params }) => {
    const resolved = params.slug === "intro" ? "getting-started" : params.slug;
    if (!docs.some((item) => item.slug === resolved)) throw notFound();
  },
  head: ({ params }) => {
    const resolved = params.slug === "intro" ? "getting-started" : params.slug;
    const doc = docs.find((item) => item.slug === resolved);
    return pageHead(`${doc?.title ?? "Doc"} — Docs`, doc?.description ?? "Quesar documentation.");
  },
  component: DocArticle,
});

function DocArticle() {
  const { slug } = Route.useParams();
  const resolved = slug === "intro" ? "getting-started" : slug;
  const doc = docs.find((item) => item.slug === resolved);
  if (!doc) throw notFound();
  const idx = docs.findIndex((item) => item.slug === resolved);
  const prev = docs[idx - 1];
  const next = docs[idx + 1];
  return (
    <>
      <Crumbs
        items={[
          { to: "/docs", label: "Docs" },
          { label: doc.title },
        ]}
      />
      <PageHero eyebrow={doc.group} title={doc.title} lede={doc.description} atmosphere="none" compact />
      <Section className="!pt-8">
        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]">
          <DocSidebar current={resolved} />
          <div>
            <ArticleBody sections={doc.body}>
              <SourceChips sources={doc.sources} />
            </ArticleBody>
            <Pager
              index={{ to: "/docs", label: "All docs" }}
              prev={prev ? { to: `/docs/${prev.slug}`, label: `Previous: ${prev.title}` } : undefined}
              next={next ? { to: `/docs/${next.slug}`, label: `Next: ${next.title}` } : undefined}
            />
          </div>
          <DocOutline headings={doc.body.map((section) => section.heading).filter((heading): heading is string => Boolean(heading))} />
        </div>
      </Section>
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        next={[{ to: "/developers", label: "Developers", body: "The READMEs these articles cite." }]}
      />
    </>
  );
}
