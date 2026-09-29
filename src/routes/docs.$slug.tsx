import { createFileRoute, notFound } from "@tanstack/react-router";
import { SourceChips } from "@/components/site/article";
import { MathArticleBody } from "@/components/site/math-article";
import { DocOutline, DocSidebar } from "@/components/site/doc-nav";
import { DocReference } from "@/components/site/docs-hub";
import { docsHubSection } from "@/components/site/docs-hub-anchors";
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
    const doc = docs.find((item) => item.slug === params.slug);
    if (!doc) throw notFound();
    return { title: doc.title, description: doc.description, ld: docLd(doc) };
  },
  head: ({ loaderData }) => ({
    ...pageHead(
      `${loaderData?.title ?? "Doc"} — Docs`,
      loaderData?.description ?? "Quesar documentation.",
    ),
    scripts: loaderData ? [jsonLdScript(loaderData.ld)] : [],
  }),
  component: DocArticle,
});

function DocArticle() {
  const { slug } = Route.useParams();
  const idx = docs.findIndex((item) => item.slug === slug);
  const doc = docs[idx];
  if (!doc) throw notFound();
  const prev = docs[idx - 1];
  const next = docs[idx + 1];
  const reference = docsHubSection(doc.slug);
  return (
    <>
      <Crumbs items={[{ to: "/docs", label: "Docs" }, { label: doc.title }]} />
      <PageHero eyebrow={doc.group} title={doc.title} lede={doc.description} compact />
      <Section className="!pt-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]">
          <DocSidebar current={doc.slug} />
          <div>
            <MathArticleBody sections={doc.body}>
              <SourceChips sources={doc.sources} />
              <p className="mt-4 text-xs text-fg-subtle">
                Checked against these sources on{" "}
                <time dateTime={doc.reviewedAt}>{doc.reviewedAt}</time>.
              </p>
            </MathArticleBody>
            <DocReference slug={doc.slug} />
            <Pager
              index={{ to: "/docs", label: "All docs" }}
              prev={
                prev ? { to: `/docs/${prev.slug}`, label: `Previous: ${prev.title}` } : undefined
              }
              next={next ? { to: `/docs/${next.slug}`, label: `Next: ${next.title}` } : undefined}
            />
          </div>
          <DocOutline
            headings={[
              ...doc.body.flatMap((section) => (section.heading ? [section.heading] : [])),
              ...(reference ? [reference.title] : []),
            ]}
          />
        </div>
      </Section>
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        next={[
          { to: "/developers", label: "Developers", body: "The READMEs these articles cite." },
        ]}
      />
    </>
  );
}
