import { createFileRoute } from "@tanstack/react-router";
import { BulletSurface, CopyGrid, PageClose, PageHero, Section } from "@/components/site";
import { SpecList } from "@/components/site/lab";
import { about } from "@/lib/mlai";
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
      <PageHero eyebrow="About" title="Safety before scale." lede={site.origin} atmosphere="lab" />
      <Section eyebrow="Values" title="What the company is for.">
        <CopyGrid items={about.values.map((value) => ({ title: value.title, body: value.description }))} />
      </Section>
      <Section eyebrow="Principles" title="Four lines we do not cross.">
        <BulletSurface items={about.operatingPrinciples} />
      </Section>
      <Section eyebrow="Entity" title="Registration-level facts.">
        <SpecList rows={about.companyFacts} />
      </Section>
      <PageClose
        primary={{ to: "/company", label: "Company" }}
        secondary={[{ to: "/team", label: "Team" }]}
        next={[
          { to: "/investors", label: "Investors", body: "TAM and ARR tagged as targets, not results." },
          { to: "/services", label: "Services", body: "Integration work with named limits." },
        ]}
      />
    </>
  );
}
