import { createFileRoute } from "@tanstack/react-router";
import { BulletSurface, CopyGrid, PageClose, PageHero, Section } from "@/components/site";
import { SpecList } from "@/components/site/lab";
import { about } from "@/lib/mlai/categories/about";
import { aboutMission, aboutWhoWeAre } from "@/lib/mlai/pages";
import { site } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead("About — MLAI Corporation", "MLAI Corporation values, operating principles, and registration-level facts."),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title="Safety before scale." lede={site.origin} />
      <Section eyebrow="Who we are" title={aboutWhoWeAre.title} lede={aboutWhoWeAre.body}>
        <ul className="grid gap-3 font-mono text-sm text-accent sm:grid-cols-2">
          {aboutWhoWeAre.identity.map((fact) => (
            <li key={fact} className="flex items-center gap-3">
              <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
      </Section>
      <Section eyebrow="Values" title="What the company is for.">
        <CopyGrid items={about.values.map((value) => ({ title: value.title, body: value.description }))} />
      </Section>
      <Section eyebrow="Our mission" title={aboutMission.title}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
          <p className="max-w-[66ch] text-lg leading-8 text-fg">{aboutMission.body}</p>
          <SpecList rows={aboutMission.facts} />
        </div>
      </Section>
      <Section eyebrow="Principles" title="Four lines we do not cross.">
        <BulletSurface items={about.operatingPrinciples} />
      </Section>
      <Section eyebrow="Thesis" title="Why on-device wins.">
        <CopyGrid
          columns="md:grid-cols-3"
          items={about.investorThesis.map((item) => ({ title: item.title, body: item.description }))}
        />
      </Section>
      <Section eyebrow="Entity" title="Registration-level facts.">
        <SpecList rows={about.companyFacts} />
      </Section>
      <PageClose
        primary={{ to: "/contact", label: "Start an inquiry" }}
        secondary={[
          { to: "/company", label: "Company" },
          { to: "/team", label: "Team" },
          { to: "/research", label: "Read our research" },
        ]}
        next={[
          { to: "/investors", label: "Investors", body: "TAM and ARR tagged as targets, not results." },
          { to: "/services", label: "Services", body: "Integration work with named limits." },
        ]}
      />
    </>
  );
}
