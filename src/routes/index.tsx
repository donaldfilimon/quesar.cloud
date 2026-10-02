import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/site/status-badge";
import { clientExperience } from "@/lib/mlai/categories/client-experience";
import { Backtrace } from "@/components/site/backtrace";
import { Trailer } from "@/components/site/trailer";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site-identity";
import { jsonLdScript } from "@/lib/mlai/structured-data";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MLAI Corporation",
  legalName: site.legal,
  url: "https://quesar.cloud/",
  description: site.mission,
  sameAs: [
    "https://github.com/donaldfilimon/quesar.cloud",
    "https://github.com/donaldfilimon/abi",
    "https://github.com/donaldfilimon/wdbx",
    "https://github.com/donaldfilimon/abbey",
    "https://github.com/donaldfilimon/skill-creator",
    "https://github.com/donaldfilimon/gama",
  ],
};

const HOME_TITLE = `${site.company}: AI engineering`;
const HOME_DESCRIPTION =
  "AI engineering engagements for traceable retrieval, bounded agent workflows, and private deployment.";

export const Route = createFileRoute("/")({
  head: () => ({
    ...pageHead(HOME_TITLE, HOME_DESCRIPTION),
    scripts: [jsonLdScript(organizationLd)],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <Hero />
      <Row id="engagements" label="Services" title="Choose the next engineering decision." wide>
        <div className="grid gap-8 md:grid-cols-3">
          {clientExperience.engagementPaths.map((path) => (
            <article key={path.id} className="border-t border-border pt-6">
              <StatusBadge status={path.status} />
              <h3 className="mt-4 font-display text-2xl">{path.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-fg-muted">{path.body}</p>
              <ul className="mt-5 space-y-2 text-sm text-fg-muted">
                {path.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
              <Link to={path.href} className="mt-6 inline-block text-accent">
                Explore services →
              </Link>
            </article>
          ))}
        </div>
      </Row>
      <Row id="evidence" label="Evidence" title="Inspect the work before choosing a path.">
        <ul className="divide-y divide-border border-y border-border">
          {clientExperience.evidenceDoors.map((door) => (
            <li key={door.href} className="py-5">
              <Link to={door.href} className="font-display text-xl text-accent">
                {door.title}
              </Link>
              <p className="mt-2 text-base leading-relaxed text-fg-muted">{door.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-relaxed text-fg-muted">
          {clientExperience.landingIntros.products.availability}
        </p>
      </Row>
      <Row
        id="film"
        label="The film"
        title="See the direction. Inspect the evidence."
        lede={clientExperience.landingIntros.showcase.availability}
      >
        <Trailer />
        <Link to="/showcase" className="mt-5 inline-block text-accent">
          Explore the showcase →
        </Link>
      </Row>
      <Row
        id="process"
        label="Engagement process"
        title="Agree on the evidence before implementation."
      >
        <ol className="divide-y divide-border border-y border-border">
          {clientExperience.engagementProcess.map((step, index) => (
            <li key={step.title} className="py-5">
              <h3 className="font-display text-xl">
                <span className="mr-3 font-mono text-sm text-fg-subtle">0{index + 1}</span>
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-fg-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Row>
      <Row
        id="contact"
        label="Next step"
        title="Discuss your project."
        lede={clientExperience.landingIntros.company.availability}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/contact">Discuss your project</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/services">Explore services</Link>
          </Button>
        </div>
      </Row>
    </>
  );
}

function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="lg:col-span-7">
          <p className="eyebrow">{clientExperience.hero.eyebrow}</p>
          <h1 className="display-title mt-6 lg:max-w-[14ch]">{clientExperience.hero.title}</h1>
          <p className="mt-7 max-w-[54ch] text-lg leading-8 text-fg-muted">
            {clientExperience.hero.lede}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={clientExperience.hero.primaryCta.href}>
                {clientExperience.hero.primaryCta.label}
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to={clientExperience.hero.secondaryCta.href}>
                {clientExperience.hero.secondaryCta.label}
              </Link>
            </Button>
          </div>
        </div>
        <div className="lg:col-span-5">
          <Backtrace />
        </div>
      </div>
    </section>
  );
}

/**
 * Editorial row: the section's name and claim on the left five columns, the
 * evidence on the right seven. `wide` puts the evidence full width below.
 */
function Row({
  id,
  label,
  title,
  lede,
  wide = false,
  children,
}: {
  id: string;
  label: string;
  title: string;
  lede?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 border-b border-border"
    >
      <div
        className={cn(
          "mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24",
          wide ? "" : "lg:grid-cols-12 lg:gap-10",
        )}
      >
        <header className={cn(wide ? "max-w-3xl" : "lg:col-span-5")}>
          <p className="eyebrow">{label}</p>
          <h2 id={`${id}-title`} className="section-title mt-4">
            {title}
          </h2>
          {lede ? (
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-fg-muted">{lede}</p>
          ) : null}
        </header>
        <div className={cn("min-w-0", wide ? "" : "lg:col-span-7")}>{children}</div>
      </div>
    </section>
  );
}
