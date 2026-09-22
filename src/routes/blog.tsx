import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CopyGrid, FilterChips, PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { blog } from "@/lib/mlai";
import { blogRubrics } from "@/lib/mlai/pages";
import { pageHead } from "@/lib/seo";

const tagOptions = [
  { value: "all", label: "All notes" },
  ...[...new Set(blog.map((post) => post.tag))].map((tag) => ({ value: tag, label: tag })),
];

export const Route = createFileRoute("/blog")({
  head: () => ({
    ...pageHead("Blog — MLAI", "Engineering notes from MLAI: memory, personas, privacy, and runtime discipline."),
    links: [{ rel: "alternate", type: "application/rss+xml", title: "MLAI lab notes and research", href: "/feed.xml" }],
  }),
  component: BlogPage,
});

function BlogPage() {
  const [tag, setTag] = useState("all");
  const posts = useMemo(() => (tag === "all" ? blog : blog.filter((post) => post.tag === tag)), [tag]);
  return (
    <RouteFrame>
      <PageHero
        eyebrow="Lab notes"
        title="Notes with their hedges left on."
        lede="Research notes for teams building serious AI systems: retrieval, autonomy, interface design, evaluation, and the discipline to move from experiments to reliable operations. If a figure appears, it is tagged or it does not ship."
      />
      <Section>
        <CopyGrid items={blogRubrics} columns="md:grid-cols-3" />
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <FilterChips label="Note tag" value={tag} onChange={setTag} options={tagOptions} />
          <a href="/feed.xml" className="font-mono text-xs tracking-wide text-accent">
            RSS feed
          </a>
        </div>
        <div className="mt-6">
          <CopyGrid
            columns="md:grid-cols-1"
            items={posts.map((post) => ({
              title: post.title,
              body: post.excerpt,
              kicker: `${post.tag} · ${post.date} · ${post.readTime}`,
              note: post.author ? `By ${post.author}` : undefined,
              href: `/blog/${post.slug}`,
            }))}
          />
        </div>
      </Section>
      <PageClose
        next={[
          { to: "/research", label: "Research", body: "The longer notes with sources attached." },
          { to: "/changelog", label: "Changelog", body: "What moved, with dates." },
        ]}
      />
    </RouteFrame>
  );
}
