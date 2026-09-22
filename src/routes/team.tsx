import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { team } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/team")({
  head: () => pageHead("Team — MLAI", "MLAI team: founder and systems architect Donald Filimon."),
  component: TeamPage,
});

function TeamPage() {
  return (
    <RouteFrame>
      <PageHero eyebrow="Team" title="A small company. Public source." lede="People who ship the trees this site orients." />
      <Section>
        <CopyGrid
          items={team.map((person) => ({
            title: person.name,
            body: person.tagline ?? person.bio,
            kicker: person.role,
            href: person.slug ? `/team/${person.slug}` : undefined,
          }))}
        />
      </Section>
      <PageClose
        primary={{ to: "/company", label: "Company" }}
        next={[
          { to: "/about", label: "About", body: "Values and registration-level facts." },
          { to: "/developers", label: "Developers", body: "The public tree this team ships." },
        ]}
      />
    </RouteFrame>
  );
}
