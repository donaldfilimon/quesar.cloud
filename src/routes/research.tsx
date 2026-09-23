import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CopyGrid, FilterChips, PageClose, PageHero, RouteFrame, Section, Surface } from "@/components/site";
import { research } from "@/lib/mlai/categories/research";
import { researchContext } from "@/lib/mlai/categories/research-context";
import { researchSources, researchTopics } from "@/lib/content";
import { pageHead } from "@/lib/seo";

const topicOptions = [
  { value: "all", label: "All tracks" },
  ...research.tracks.map((track) => ({ value: track.id, label: track.name })),
] as const;

const kindOptions = [
  { value: "all", label: "All documents" },
  { value: "overview", label: "Overviews" },
  { value: "research-note", label: "Notes" },
  { value: "implementation-guide", label: "Guides" },
] as const;

export const Route = createFileRoute("/research")({
  head: () => ({
    ...pageHead(
      "Research — MLAI memory, retrieval, and orchestration",
      "Research notes for MLAI and Quesar: memory architecture, retrieval, provenance, local inference, and implementation case studies with sources attached.",
    ),
    links: [{ rel: "alternate", type: "application/rss+xml", title: "MLAI lab notes and research", href: "/feed.xml" }],
  }),
  component: ResearchPage,
});

function ResearchPage() {
  const [topic, setTopic] = useState<(typeof topicOptions)[number]["value"]>("all");
  const [kind, setKind] = useState<(typeof kindOptions)[number]["value"]>("all");
  const papers = useMemo(
    () =>
      research.publications.filter((paper) => {
        if (topic !== "all" && paper.topic !== topic) return false;
        if (kind !== "all" && paper.documentType !== kind) return false;
        return true;
      }),
    [topic, kind],
  );
  const cases = useMemo(
    () => (topic === "all" ? researchContext : researchContext.filter((item) => item.relatedTopics.includes(topic))),
    [topic],
  );

  return (
    <RouteFrame>
      <PageHero
        eyebrow="Research"
        title="Ideas with their evidence attached."
        lede="Six tracks, the public notes on each, and the nested implementation cases that pin those claims to source. Citations stay on the page. Borrowed benchmarks do not."
      />

      <Section
        eyebrow="Tracks"
        title="Start from the subject, not a paper pile."
        lede="Six research areas, from AI assistance and durable memory to evidence selection and integration. Start with practical applications, then inspect the sources, implementation status, and limitations."
      >
        <p className="-mt-6 mb-8 text-sm text-fg-muted">
          Put these ideas in context: <Link to="/products" className="text-accent">explore ABI, Abbey, WDBX and Quasar</Link>, or{" "}
          <Link to="/get-started" className="text-accent">choose a starting point</Link>.
        </p>
        <CopyGrid
          columns="md:grid-cols-2 xl:grid-cols-3"
          items={research.tracks.map((track) => ({
            kicker: track.id,
            title: track.name,
            body: track.description,
            note: track.availability,
            href: `/research/${track.overviewSlug}`,
          }))}
        />
      </Section>

      <Section
        eyebrow="Topics"
        title="Precise language. No borrowed benchmarks."
        lede="If a number is not produced by a repository test or a documented artifact, it does not appear here."
      >
        <CopyGrid
          items={researchTopics.map((item) => ({
            title: item.title,
            body: `${item.body} Applies to ${item.applies}.`,
            status: item.status,
          }))}
        />
      </Section>

      <Section eyebrow="Collection" title="Notes, overviews, and implementation guides.">
        <div className="grid gap-3">
          <FilterChips label="Research track" value={topic} onChange={setTopic} options={topicOptions} />
          <FilterChips label="Document type" value={kind} onChange={setKind} options={kindOptions} />
        </div>
        <div className="mt-6 grid gap-4">
          {papers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents in that slice.</p>
          ) : (
            papers.map((paper) => (
              <Link key={paper.slug} to="/research/$slug" params={{ slug: paper.slug }} className="no-underline">
                <Surface hover>
                  <p className="text-xs text-accent">
                    {paper.tag} · {paper.documentType.replaceAll("-", " ")} · {paper.status} · {paper.date} · {paper.readTime}
                  </p>
                  <h3 className="mt-2 font-display text-xl">{paper.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{paper.practicalSummary}</p>
                </Surface>
              </Link>
            ))
          )}
        </div>
      </Section>

      <Section
        eyebrow="Implementations"
        title="Nested cases. Each one names the source it depends on."
        lede="These sit under /research/implementations. They are implementation readings, not extra benchmark claims."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((item) => (
            <Link
              key={item.slug}
              to="/research/implementations/$slug"
              params={{ slug: item.slug }}
              className="no-underline"
            >
              <Surface hover className="h-full">
                <p className="text-xs text-accent">
                  {item.relatedTopics.join(" · ")}
                </p>
                <h3 className="mt-2 font-display text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
              </Surface>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Sources" title="Setup and claims, on this site.">
        <CopyGrid items={researchSources.map((source) => ({ title: source.title, body: source.body, href: source.href }))} />
      </Section>
      <PageClose
        next={[
          { to: "/research/implementations", label: "Implementation index", body: "The seven nested case studies." },
          { to: "/developers", label: "Developers", body: "Run the gates that produce the evidence." },
          { to: "/architecture", label: "Architecture", body: "Map topics onto the stack." },
        ]}
      />
    </RouteFrame>
  );
}
