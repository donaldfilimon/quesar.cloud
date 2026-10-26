import { createFileRoute, Link } from "@/framework/router";
import { PageClose, PageHero, RouteFrame, Section, Surface } from "@/components/site";
import { researchContext } from "@/lib/mlai/categories/research-context";
import { pageHead } from "@/lib/seo";
import { collectionPageLd, jsonLdScript } from "@/lib/mlai/structured-data";

const title = "Research implementations — Quesar";
const description =
  "Nested MLAI implementation cases: platform layers, document pipeline, mobile vault, Quasar generation, Abbey claims, WDBX specimen, and research export.";

export const Route = createFileRoute("/research/implementations")({
  head: () => ({
    ...pageHead(title, description),
    scripts: [
      jsonLdScript(
        collectionPageLd(
          "/research/implementations",
          title,
          description,
          researchContext.map((item) => ({
            url: `/research/implementations/${item.slug}`,
            name: item.title,
          })),
        ),
      ),
    ],
  }),
  component: ImplementationsPage,
});

function ImplementationsPage() {
  return (
    <RouteFrame>
      <PageHero
        eyebrow="Research · implementations"
        title="What the repositories actually contain."
        lede="Seven nested readings. Each one stays inside a source revision and says what that source does not prove."
      />
      <Section>
        <div className="grid gap-4">
          {researchContext.map((item) => (
            <Link
              key={item.slug}
              to="/research/implementations/$slug"
              params={{ slug: item.slug }}
              className="no-underline"
            >
              <Surface hover>
                <p className="text-xs text-accent">
                  {item.relatedTopics.join(" · ")} · {item.sources.length} sources
                </p>
                <h2 className="mt-2 font-display text-2xl">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
              </Surface>
            </Link>
          ))}
        </div>
      </Section>
      <PageClose primary={{ to: "/research", label: "Research index" }} />
    </RouteFrame>
  );
}
