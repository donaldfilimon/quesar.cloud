import { clientExperience } from "@/lib/mlai/categories/client-experience";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { Callout, StepList } from "@/components/site/lab";
import { Button } from "@/components/ui/button";
import { engagement, refusals, services } from "@/lib/mlai/categories/services";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/services")({
  head: () =>
    pageHead(
      "Services — MLAI engineering",
      "MLAI engineering services: audit, design, build, and harden AI systems that need traceability, private deployment, and operational control.",
    ),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow={clientExperience.landingIntros.services.eyebrow}
        title={clientExperience.landingIntros.services.title}
        lede={clientExperience.landingIntros.services.lede}
      />
      <Section>
        <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
          {clientExperience.landingIntros.services.availability}
        </p>
        <a
          href={clientExperience.landingIntros.services.sources[0]}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm text-accent underline underline-offset-4"
        >
          Inspect the source behind this page
        </a>
      </Section>

      <Section eyebrow="Core" title="Nine proposed engagement scopes.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Surface key={service.title} className="flex h-full flex-col">
              <h3 className="font-display text-xl">{service.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
                {service.description}
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg-muted">
                {service.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
              <Link
                to="/contact"
                search={{ service: service.title }}
                className="mt-5 inline-flex items-center gap-2 border-t border-border pt-4 text-sm text-accent no-underline hover:underline"
              >
                Discuss this service <span aria-hidden="true">→</span>
              </Link>
            </Surface>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Proposed engagement process"
        title="Define the release evidence together."
        lede="These four proposed phases identify deliverables to agree for each project: a register, a harness, a baseline, and acceptance criteria."
      >
        <StepList steps={engagement} />
      </Section>

      <Section eyebrow="Fit" title="What we say no to.">
        <div className="grid gap-4 md:grid-cols-2">
          {refusals.map((refusal) => (
            <Callout key={refusal.label} label={refusal.label}>
              {refusal.body}
            </Callout>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/contact">Discuss your project</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/architecture">Read the architecture</Link>
          </Button>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/contact", label: "Discuss your project" }}
        next={[
          {
            to: "/developers",
            label: "Developers",
            body: "What you can run without an engagement.",
          },
          {
            to: "/company",
            label: "Company",
            body: "Who develops this, and the site's integrity rules.",
          },
        ]}
      />
    </>
  );
}
