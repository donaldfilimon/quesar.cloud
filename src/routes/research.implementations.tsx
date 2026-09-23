import { createFileRoute, Link } from "@tanstack/react-router";
import { PageClose, PageHero, RouteFrame, Section, Surface } from "@/components/site";
import { researchContext } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/research/implementations")({
  head: () =>
    pageHead(
      "Research implementations — Quesar",
      "Nested MLAI implementation cases: platform layers, document pipeline, mobile vault, Quasar generation, Abbey claims, WDBX specimen, and research export.",
    ),
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
            <Link key={item.slug} to="/research/implementations/$slug" params={{ slug: item.slug }} className="no-underline">
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
