import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleBody } from "@/components/site/article";
import { PageClose, PageHero, Section } from "@/components/site";
import { blog } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/blog/$slug")({
  beforeLoad: ({ params }) => {
    if (!blog.some((item) => item.slug === params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const post = blog.find((item) => item.slug === params.slug);
    return pageHead(`${post?.title ?? "Note"} — Blog`, post?.excerpt ?? "MLAI engineering note.");
  },
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const post = blog.find((item) => item.slug === slug);
  if (!post) throw notFound();
  return (
    <>
      <PageHero
        eyebrow={`${post.tag} · ${post.date}`}
        title={post.title}
        lede={post.excerpt}
        atmosphere="lab"
      />
      <Section>
        <ArticleBody sections={post.body} />
      </Section>
      <PageClose
        primary={{ to: "/blog", label: "All notes" }}
        next={[{ to: "/research", label: "Research", body: "The papers these notes sit beside." }]}
      />
    </>
  );
}
