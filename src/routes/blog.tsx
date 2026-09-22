import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { blog } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/blog")({
  head: () =>
    pageHead("Blog — MLAI", "Engineering notes from MLAI: memory, personas, privacy, and runtime discipline."),
  component: BlogPage,
});

function BlogPage() {
  return (
    <RouteFrame>
      <PageHero
        eyebrow="Blog"
        title="Notes with their hedges left on."
        lede="Essays and engineering logs. If a figure appears, it is tagged or it does not ship."
      />
      <Section>
        <CopyGrid
          columns="md:grid-cols-1"
          items={blog.map((post) => ({
            title: post.title,
            body: post.excerpt,
            kicker: `${post.tag} · ${post.date} · ${post.readTime}`,
            href: `/blog/${post.slug}`,
          }))}
        />
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
