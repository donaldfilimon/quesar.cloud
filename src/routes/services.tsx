import { createFileRoute, Link } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { Callout, StepList } from "@/components/site/lab";
import { Button } from "@/components/ui/button";
import { engagement, refusals, services } from "@/lib/mlai/categories/services";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — MLAI engineering" },
      {
        name: "description",
        content:
          "MLAI engineering services: audit, design, build, and harden AI systems that need traceability, private deployment, and operational control.",
      },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Audit, design, build, and harden."
        lede="Work that needs traceability, private deployment options, and operational control. If the engagement requires your corpus to leave your hardware, the engagement is designed wrong."
      />

      <Section eyebrow="Core" title="Nine engagements. Each ends with evidence.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Surface key={service.title} className="flex h-full flex-col">
              <h3 className="font-display text-xl">{service.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">{service.description}</p>
              <ul className="mt-4 space-y-1.5">
                {service.outcomes.map((outcome) => (
                  <li key={outcome} className="font-mono text-[11px] text-fg-subtle">
                    → {outcome}
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className="mt-5 inline-flex items-center gap-2 border-t border-border pt-4 text-sm text-accent no-underline hover:underline"
              >
                Discuss this service <span aria-hidden="true">→</span>
              </Link>
            </Surface>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="How an engagement runs"
        title="From audit to governed production."
        lede="Four phases, in order. Each one ends with evidence — a register, a harness, a baseline — that gates the next."
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
            <Link to="/contact">Start from source</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/architecture">Read the architecture</Link>
          </Button>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/contact", label: "Contact" }}
        next={[
          { to: "/developers", label: "Developers", body: "What you can run without an engagement." },
          { to: "/company", label: "Company", body: "Who ships this, and under which rules." },
        ]}
      />
    </>
  );
}
