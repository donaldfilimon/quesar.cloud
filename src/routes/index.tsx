import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/site/status-badge";
import { clientExperience } from "@/lib/mlai/categories/client-experience";
import { Backtrace } from "@/components/site/backtrace";
import { NeuralField } from "@/components/site/neural-field";
import { Trailer } from "@/components/site/trailer";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site-identity";
import { jsonLdScript } from "@/lib/mlai/structured-data";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { homeVision } from "@/lib/home-vision";
import "@/components/site/home-vision.css";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.company,

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

const HOME_TITLE = `Quesar by ${site.company}: Private AI operations`;
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
      <section className="vision-belief border-b border-border" aria-labelledby="belief-title">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <h2
            id="belief-title"
            className="font-display text-3xl leading-tight tracking-tight sm:text-4xl"
          >
            {homeVision.belief.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
            {homeVision.belief.body}
          </p>
        </div>
      </section>
      <Row
        id="ecosystem"
        label="The MLAI ecosystem"
        title="Distinct roles. One inspectable architecture."
        wide
        lede="Abbey, Aviva, and Abi are persona roles in ABI. WDBX supplies the memory substrate. Read each implementation boundary before integrating."
      >
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {homeVision.ecosystem.map((product) => (
            <article key={product.name} className={`vision-product vision-product-${product.tone}`}>
              <StatusBadge status={product.status} />
              <h3 className="mt-6 font-display text-3xl tracking-tight">{product.name}</h3>
              <p className="vision-product-role mt-2 text-sm font-medium">{product.role}</p>
              <p className="mt-5 text-base leading-relaxed text-fg-muted">{product.body}</p>
              <p className="mt-4 text-sm leading-relaxed text-fg-subtle">{product.boundary}</p>
              <Link
                to={product.href}
                className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-accent"
              >
                Explore {product.name} →
              </Link>
            </article>
          ))}
        </div>
        <figure className="vision-architecture mt-12 rounded-lg border border-border bg-bg-elevated p-6 sm:p-8">
          <ol className="grid gap-6 sm:grid-cols-3" aria-label="Conceptual request flow">
            {["Your context", "ABI routing", "Selected persona"].map((step, index) => (
              <li key={step} className="font-display text-xl">
                <span className="mb-2 block font-mono text-xs text-fg-subtle">0{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t border-border pt-5 text-base">
            <span className="font-medium text-accent">WDBX</span>
            <span className="ml-3 text-fg-muted">
              Context and storage · writes report their result
            </span>
          </div>
          <figcaption className="mt-4 text-sm leading-relaxed text-fg-subtle">
            Conceptual architecture. Persona roles share a runtime; this diagram does not establish
            separate models or hosted services.
          </figcaption>
          <Link
            to="/architecture"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-accent"
          >
            Inspect the architecture →
          </Link>
          <div
            className="mt-4 flex flex-wrap gap-x-5 gap-y-1"
            aria-label="Pinned ecosystem sources"
          >
            {homeVision.sources.map((source) => (
              <a
                key={source.href}
                href={source.href}
                className="inline-flex min-h-11 items-center text-xs text-accent underline underline-offset-4"
              >
                {source.label}
              </a>
            ))}
          </div>
        </figure>
      </Row>
      <Row
        id="memory"
        label="Memory with provenance"
        title="An answer should carry its context."
        lede="Explore the sources, retrieval weights, and causal history behind a memory system. This example illustrates an inspectable trace."
      >
        <Backtrace />
        <Link
          to="/docs/$slug"
          params={{ slug: "wdbx" }}
          className="mt-5 inline-flex min-h-11 items-center text-accent"
        >
          Read the WDBX guide →
        </Link>
      </Row>
      <Row
        id="developers"
        label="For builders"
        title={homeVision.developer.title}
        lede={homeVision.developer.body}
      >
        <div className="vision-code rounded-lg border border-border bg-bg-elevated p-5 sm:p-7">
          <p className="mb-5 font-mono text-xs text-fg-subtle">
            Local CLI example — requires ABI source setup
          </p>
          <pre className="overflow-x-auto text-sm leading-7">
            <code>{homeVision.developer.code}</code>
          </pre>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-fg-muted">
          {homeVision.developer.availability}
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/developers" className="inline-flex min-h-11 items-center text-accent">
            Read the developer path →
          </Link>
          <Link
            to="/docs/$slug"
            params={{ slug: "getting-started" }}
            className="inline-flex min-h-11 items-center text-accent"
          >
            Open setup guide →
          </Link>
        </div>
      </Row>
      <Row
        id="research"
        label="Research and simulation"
        title={homeVision.research.title}
        lede={homeVision.research.body}
      >
        <div className="border-t border-border pt-6">
          <StatusBadge status="development" />
          <h3 className="mt-4 font-display text-2xl">{homeVision.spatial.title}</h3>
          <p className="mt-3 text-base leading-relaxed text-fg-muted">{homeVision.spatial.body}</p>
          <p className="mt-4 text-sm leading-relaxed text-fg-subtle">
            {homeVision.spatial.boundary}
          </p>
          <Link
            to="/source/$name"
            params={{ name: "nyon" }}
            className="mt-5 inline-flex min-h-11 items-center text-accent"
          >
            Explore NYON’s source →
          </Link>
        </div>
        <Link to="/research" className="mt-4 inline-flex min-h-11 items-center text-accent">
          Visit the research library →
        </Link>
      </Row>
      <Row
        id="engagements"
        label="For organizations · Services"
        title="Choose the next engineering decision."
        lede="Define a private AI engagement around retrieval, tool permissions, deployment topology, and evaluation. Scope and acceptance criteria are agreed for each project."
        wide
      >
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
        id="community"
        label="Open development"
        title={homeVision.community.title}
        lede={homeVision.community.body}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary" size="lg">
            <Link to="/source">Explore the repositories</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/plugins">Explore plugins</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/showcase/design">Explore the design system</Link>
          </Button>
        </div>
      </Row>
      <Row
        id="vision"
        label="Future vision"
        title="The next generation of human + AI."
        lede="These are product directions. Availability and implementation evidence remain in the source catalog."
        wide
      >
        <div className="grid gap-8 md:grid-cols-3">
          {homeVision.roadmap.map((direction) => (
            <article key={direction.title} className="border-t border-border pt-6">
              <StatusBadge status="planned" />
              <h3 className="mt-4 font-display text-2xl">{direction.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">{direction.body}</p>
            </article>
          ))}
        </div>
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
    <section className="vision-hero" aria-labelledby="hero-title">
      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pt-14 pb-12 sm:px-6 sm:pt-20 sm:pb-16 lg:grid-cols-12 lg:items-center lg:gap-4">
        <div className="relative z-10 min-w-0 lg:col-span-7">
          <p className="vision-eyebrow">Quesar by MLAI · {clientExperience.hero.tagline}</p>
          <h1 id="hero-title" className="vision-title mt-7">
            {homeVision.hero.title}
            <br />
            <span>{homeVision.hero.emphasis}</span>
          </h1>
          <p className="vision-lede mt-7 max-w-[50ch] text-lg leading-8">{homeVision.hero.lede}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="vision-primary">
              <Link to={clientExperience.hero.primaryCta.href}>
                {clientExperience.hero.primaryCta.label}
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="vision-secondary">
              <Link to={clientExperience.hero.secondaryCta.href}>
                {clientExperience.hero.secondaryCta.label}
              </Link>
            </Button>
            <Link
              to="/abbey"
              className="vision-abbey inline-flex min-h-11 items-center px-2 text-sm font-medium"
            >
              Meet Abbey →
            </Link>
          </div>
        </div>
        <div className="vision-neural min-w-0 lg:col-span-5">
          <NeuralField />
        </div>
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-wrap gap-x-8 gap-y-2 border-t border-white/10 px-4 py-5 text-sm sm:px-6">
        <a href="#ecosystem" className="vision-section-link inline-flex min-h-11 items-center">
          Explore the ecosystem ↓
        </a>
        <a href="#film" className="vision-section-link inline-flex min-h-11 items-center">
          Watch the film ↓
        </a>
        <Link to="/developers" className="vision-section-link inline-flex min-h-11 items-center">
          Build with MLAI →
        </Link>
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
