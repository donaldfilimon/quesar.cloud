import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Globe, MapPin } from "lucide-react";
import { MathArticleBody } from "@/components/site/math-article";
import { CopyGrid, PageClose, PageHero, Section } from "@/components/site";
import { ProfilePhoto } from "@/components/site/profile-photo";
import { Button } from "@/components/ui/button";
import { team } from "@/lib/mlai/categories/team";
import { jsonLdScript, personLd } from "@/lib/mlai/structured-data";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/team/$slug")({
  // `team` is only referenced from `loader` and `component`, which share one lazy
  // chunk; `head` reads loaderData so the dataset stays out of the main bundle.
  codeSplitGroupings: [["loader", "component"]],
  loader: ({ params }) => {
    const person = team.find((item) => item.slug === params.slug);
    if (!person) throw notFound();
    return { name: person.name, description: person.tagline ?? person.bio, ld: personLd(person) };
  },
  head: ({ loaderData }) => ({
    ...pageHead(`${loaderData?.name ?? "Team"} — MLAI`, loaderData?.description ?? "MLAI team."),
    scripts: loaderData ? [jsonLdScript(loaderData.ld)] : [],
  }),
  component: TeamProfile,
});

function TeamProfile() {
  const { slug } = Route.useParams();
  const person = team.find((item) => item.slug === slug);
  if (!person) throw notFound();
  const socials = person.socials ?? {};
  const web = socials.web ? (socials.web.startsWith("http") ? socials.web : `https://${socials.web}`) : null;
  return (
    <>
      <PageHero eyebrow={person.role} title={person.name} lede={person.tagline ?? person.bio} />
      <Section>
        <div className="grid gap-10 md:grid-cols-[18rem_minmax(0,1fr)] md:items-start">
          <div className="md:sticky md:top-28">
            <ProfilePhoto name={person.name} image={person.image} className="aspect-square w-full" />
            {socials.github || socials.x || web ? (
              <ul className="mt-5 flex flex-wrap gap-2 text-sm">
                {socials.github ? (
                  <li>
                    <a
                      href={`https://github.com/${socials.github}`}
                      rel="noopener noreferrer"
                      target="_blank"
                      aria-label={`${person.name} on GitHub`}
                      className="inline-flex h-11 items-center rounded-md bg-bg-elevated px-3 font-mono text-xs text-fg-muted no-underline shadow-[var(--shadow-border)] hover:text-fg"
                    >
                      GitHub · {socials.github}
                    </a>
                  </li>
                ) : null}
                {socials.x ? (
                  <li>
                    <a
                      href={`https://x.com/${socials.x}`}
                      rel="noopener noreferrer"
                      target="_blank"
                      aria-label={`${person.name} on X`}
                      className="inline-flex h-11 items-center rounded-md bg-bg-elevated px-3 font-mono text-xs text-fg-muted no-underline shadow-[var(--shadow-border)] hover:text-fg"
                    >
                      X · @{socials.x}
                    </a>
                  </li>
                ) : null}
                {web ? (
                  <li>
                    <a
                      href={web}
                      rel="noopener noreferrer"
                      target="_blank"
                      aria-label={`${person.name} website`}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-bg-elevated px-3 font-mono text-xs text-fg-muted no-underline shadow-[var(--shadow-border)] hover:text-fg"
                    >
                      <Globe className="size-3.5" aria-hidden="true" /> {socials.web}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
          <div>
            {person.location ? (
              <p className="flex items-center gap-2 text-xs text-fg-subtle">
                <MapPin className="size-3" aria-hidden="true" /> {person.location}
              </p>
            ) : null}
            <p className="mt-4 max-w-[66ch] text-lg leading-8 text-fg">{person.bio}</p>
            {person.focusAreas?.length ? (
              <div className="mt-12">
                <h2 className="font-display text-2xl tracking-tight">Focus areas</h2>
                <div className="mt-5">
                  <CopyGrid items={person.focusAreas.map((area) => ({ title: area.title, body: area.description }))} />
                </div>
              </div>
            ) : null}
            {person.projects?.length ? (
              <div className="mt-12">
                <h2 className="font-display text-2xl tracking-tight">Signature work</h2>
                <div className="mt-5">
                  <CopyGrid
                    items={person.projects.map((project) => ({
                      title: project.name,
                      body: project.description,
                      note: project.lang,
                      href: project.url ?? "/source",
                    }))}
                  />
                </div>
              </div>
            ) : null}
            {person.body?.length ? (
              <div className="mt-12">
                <MathArticleBody sections={person.body} />
              </div>
            ) : null}
            <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-border pt-8">
              <div>
                <p className="text-xs text-fg-subtle">Building something aligned?</p>
                <Button asChild className="mt-3">
                  <Link to="/contact">Start an inquiry</Link>
                </Button>
              </div>
              <Link to="/team" className="text-sm text-fg-muted no-underline hover:text-fg">
                ← All of the team
              </Link>
            </div>
          </div>
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
