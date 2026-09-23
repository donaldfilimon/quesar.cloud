import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MathArticleBody } from "@/components/site/math-article";
import { PageClose, PageHero, Section } from "@/components/site";
import { Button } from "@/components/ui/button";
import { blog } from "@/lib/mlai/categories/blog";
import { blogPostingLd, jsonLdScript } from "@/lib/mlai/structured-data";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/blog/$slug")({
  // `blog` is only referenced from `loader` and `component`, which share one lazy
  // chunk; `head` reads loaderData so the dataset stays out of the main bundle.
  codeSplitGroupings: [["loader", "component"]],
  loader: ({ params }) => {
    const post = blog.find((item) => item.slug === params.slug);
    if (!post) throw notFound();
    return { title: post.title, excerpt: post.excerpt, ld: blogPostingLd(post) };
  },
  head: ({ loaderData }) => ({
    ...pageHead(`${loaderData?.title ?? "Note"} — Blog`, loaderData?.excerpt ?? "MLAI engineering note."),
    scripts: loaderData ? [jsonLdScript(loaderData.ld)] : [],
  }),
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const index = blog.findIndex((item) => item.slug === slug);
  const post = blog[index];
  if (!post) throw notFound();
  const next = blog[(index + 1) % blog.length];
  return (
    <>
      <PageHero
        eyebrow={`${post.tag} · ${post.date} · ${post.readTime}`}
        title={post.title}
        lede={post.excerpt}
      >
        {post.author ? <p className="mt-5 font-mono text-xs tracking-wide text-fg-muted">By {post.author}</p> : null}
      </PageHero>
      <Section>
        <MathArticleBody sections={post.body} />
        <div className="mt-14 flex max-w-3xl flex-wrap items-center justify-between gap-6 border-t border-border pt-8">
          <Button asChild>
            <Link to="/contact">Talk to our engineers</Link>
          </Button>
          {next && next.slug !== post.slug ? (
            <Link to="/blog/$slug" params={{ slug: next.slug }} className="text-right no-underline">
              <span className="block text-xs text-fg-subtle">Next note</span>
              <span className="mt-1 block font-display text-lg text-fg hover:underline">{next.title}</span>
            </Link>
          ) : null}
        </div>
      </Section>
      <PageClose
        primary={{ to: "/blog", label: "All notes" }}
        next={[{ to: "/research", label: "Research", body: "The papers these notes sit beside." }]}
      />
    </>
  );
}
