import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";
import { PageClose, PageHero, RouteFrame, Section, Surface } from "@/components/site";
import { ProfilePhoto } from "@/components/site/profile-photo";
import { team } from "@/lib/mlai/categories/team";
import { teamIntro } from "@/lib/mlai/pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/team")({
  head: () => pageHead("Team — MLAI", "MLAI team: founder and systems architect Donald Filimon."),
  component: TeamPage,
});

function TeamPage() {
  return (
    <RouteFrame>
      <PageHero eyebrow="Team" title={teamIntro.title} lede={teamIntro.lede} />
      <Section>
        <ul className="stagger-in grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {team.map((person) => (
            <li key={person.name}>
              <Surface hover={Boolean(person.slug)} className="flex h-full flex-col">
                {person.slug ? (
                  <Link to="/team/$slug" params={{ slug: person.slug }} aria-label={`Read ${person.name}'s profile`}>
                    <ProfilePhoto name={person.name} image={person.image} className="mb-5 aspect-[3/4]" />
                  </Link>
                ) : (
                  <ProfilePhoto name={person.name} image={person.image} className="mb-5 aspect-[3/4]" />
                )}
                <h2 className="font-display text-xl">
                  {person.slug ? (
                    <Link to="/team/$slug" params={{ slug: person.slug }} className="text-fg no-underline hover:underline">
                      {person.name}
                    </Link>
                  ) : (
                    person.name
                  )}
                </h2>
                <p className="mt-1 text-xs text-accent">{person.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{person.bio}</p>
                {person.slug ? (
                  <Link
                    to="/team/$slug"
                    params={{ slug: person.slug }}
                    className="group mt-auto inline-flex items-center gap-2 pt-4 text-xs text-fg no-underline hover:text-accent"
                  >
                    Read profile
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                  </Link>
                ) : null}
              </Surface>
            </li>
          ))}
          <li>
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-bg-elevated shadow-[var(--shadow-border)]">
                <Users className="size-6 text-accent" aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-display text-xl">{teamIntro.join.title}</h2>
              <p className="mt-2 text-sm text-fg-muted">{teamIntro.join.body}</p>
              <a href={teamIntro.join.href} className="mt-5 text-xs text-accent">
                {teamIntro.join.label}
              </a>
            </div>
          </li>
        </ul>
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
