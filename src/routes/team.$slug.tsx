import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleBody } from "@/components/site/article";
import { CopyGrid, PageClose, PageHero, Section } from "@/components/site";
import { team } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/team/$slug")({
  beforeLoad: ({ params }) => {
    if (!team.some((item) => item.slug === params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const person = team.find((item) => item.slug === params.slug);
    return pageHead(`${person?.name ?? "Team"} — MLAI`, person?.tagline ?? person?.bio ?? "MLAI team.");
  },
  component: TeamProfile,
});

function TeamProfile() {
  const { slug } = Route.useParams();
  const person = team.find((item) => item.slug === slug);
  if (!person) throw notFound();
  return (
    <>
      <PageHero eyebrow={person.role} title={person.name} lede={person.tagline ?? person.bio} atmosphere="lab" />
      <Section>
        {person.focusAreas?.length ? (
          <div className="mb-10">
            <CopyGrid items={person.focusAreas.map((area) => ({ title: area.title, body: area.description }))} />
          </div>
        ) : null}
        {person.projects?.length ? (
          <CopyGrid
            items={person.projects.map((project) => ({
              title: project.name,
              body: project.description,
              note: project.lang,
              href: project.url ?? "/source",
            }))}
          />
        ) : null}
        <div className="mt-10">
          {person.body ? <ArticleBody sections={person.body} /> : <p className="text-sm text-fg-muted">{person.bio}</p>}
        </div>
      </Section>
      <PageClose
        primary={{ to: "/team", label: "Team" }}
        next={[
          { to: "/company", label: "Company", body: "Registration-level facts." },
          { to: "/source", label: "Source", body: "The public tree." },
        ]}
      />
    </>
  );
}
