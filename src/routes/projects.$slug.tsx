import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppLink } from "@/components/site/app-link";
import { BulletSurface, PageClose, PageHero, Section, Surface } from "@/components/site";
import { projects } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/projects/$slug")({
  beforeLoad: ({ params }) => {
    if (!projects.some((item) => item.slug === params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const project = projects.find((item) => item.slug === params.slug);
    return pageHead(`${project?.name ?? "Project"} — MLAI`, project?.description ?? "MLAI project.");
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { slug } = Route.useParams();
  const project = projects.find((item) => item.slug === slug);
  if (!project) throw notFound();
  return (
    <>
      <PageHero eyebrow={project.kind} title={project.name} lede={project.tagline} />
      <Section>
        <p className="max-w-3xl text-base leading-relaxed text-fg-muted">{project.description}</p>
        <div className="mt-8">
          <BulletSurface items={project.scope} />
        </div>
        <Surface className="mt-6">
          <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">Limit</p>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">{project.limit}</p>
        </Surface>
        <p className="mt-8 text-sm">
          <AppLink to={project.source.url} className="text-accent">
            {project.source.title}
          </AppLink>
        </p>
      </Section>
      <PageClose
        primary={{ to: project.docsHref, label: "Docs" }}
        secondary={[{ to: "/projects", label: "Directory" }]}
        next={[{ to: "/architecture", label: "Architecture", body: "Where this project sits on the stack." }]}
      />
    </>
  );
}
