import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { projects } from "@/lib/mlai/categories/projects";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/projects")({
  head: () =>
    pageHead("Projects — MLAI", "Public project directory: ABI, WDBX, Abbey, and Gama with limits named."),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <RouteFrame>
      <PageHero
        eyebrow="Projects"
        title="A directory with the hedges attached."
        lede="Each card names scope and a limit. Source pages stay on this site."
      />
      <Section>
        <CopyGrid
          items={projects.map((project) => ({
            title: project.name,
            body: `${project.tagline} ${project.description}`,
            kicker: project.kind,
            href: `/projects/${project.slug}`,
          }))}
        />
      </Section>
      <PageClose
        primary={{ to: "/source", label: "Source" }}
        next={[
          { to: "/research", label: "Research", body: "Ideas with their evidence attached." },
          { to: "/developers", label: "Developers", body: "Live READMEs when GitHub answers." },
        ]}
      />
    </RouteFrame>
  );
}
