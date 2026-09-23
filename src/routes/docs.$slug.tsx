import { createFileRoute, notFound } from "@tanstack/react-router";
import { SourceChips } from "@/components/site/article";
import { MathArticleBody } from "@/components/site/math-article";
import { DocOutline, DocSidebar } from "@/components/site/doc-nav";
import { Crumbs } from "@/components/site/crumbs";
import { PageClose, PageHero, Pager, Section } from "@/components/site";
import { docs } from "@/lib/mlai/categories/docs";
import { docLd, jsonLdScript } from "@/lib/mlai/structured-data";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/docs/$slug")({
  // `docs` is only referenced from `loader` and `component`, which share one lazy
  // chunk; `head` reads loaderData so the dataset stays out of the main bundle.
  codeSplitGroupings: [["loader", "component"]],
  loader: ({ params }) => {
    const resolved = params.slug === "intro" ? "getting-started" : params.slug;
    const doc = docs.find((item) => item.slug === resolved);
    if (!doc) throw notFound();
    return { title: doc.title, description: doc.description, ld: docLd(doc) };
  },
  head: ({ loaderData }) => ({
    ...pageHead(`${loaderData?.title ?? "Doc"} — Docs`, loaderData?.description ?? "Quesar documentation."),
    scripts: loaderData ? [jsonLdScript(loaderData.ld)] : [],
  }),
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
      <PageHero eyebrow={doc.group} title={doc.title} lede={doc.description} compact />
      <Section className="!pt-8">
        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]">
          <DocSidebar current={resolved} />
          <div>
            <MathArticleBody sections={doc.body}>
              <SourceChips sources={doc.sources} />
            </MathArticleBody>
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
