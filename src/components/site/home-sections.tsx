import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { research } from "@/lib/mlai/categories/research";
import { homeBoundaries, homeDocsDoors, homeProductBoundary, homeRequestPath } from "@/lib/mlai/pages";
import { AppLink } from "./app-link";
import { Section, Surface } from "./section";
import { StatusBadge } from "./status-badge";

/**
 * Home sections ported from mlai `src/views/Home.tsx` (control plane, request
 * path, product boundary, docs doors, research preview, closing CTA). The copy
 * is rewritten to what quesar implements; steps still being built carry an
 * "In development" badge rather than reading as shipping.
 */

export function HomeControlPlane() {
  return (
    <>
      <Section
        id="control-plane"
        className="scroll-mt-32"
        eyebrow="Trust boundary"
        title="Three boundaries. One control plane."
        lede="Identity, provider, and records are the same request, not settings an operator has to remember to align."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {homeBoundaries.map((item) => (
            <Surface key={item.title} accent={item.accent} className="h-full">
              <StatusBadge status={item.status} />
              <h3 className="mt-3 font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
            </Surface>
          ))}
        </div>
      </Section>
      <section id="request-path" aria-labelledby="request-path-heading" className="scroll-mt-32 border-y border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
          <div className="min-w-0 lg:sticky lg:top-32">
            <p className="eyebrow">One request</p>
            <h2 id="request-path-heading" className="section-title mt-4">
              Five control points. One return condition.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
              Authenticate, consent, generate, encrypt, commit. The design: if a control point fails, no unaudited
              response is returned. Three of the five are still being built and are labeled; until they ship, replies
              are not audited.
            </p>
            <Button asChild variant="secondary" className="mt-7">
              <Link to="/security">
                Inspect the security model <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <ol className="grid min-w-0 gap-3">
            {homeRequestPath.map((step) => (
              <li key={step.n} className="surface grid gap-3 p-5 sm:grid-cols-[3rem_minmax(0,1fr)]">
                <span className="font-mono text-sm text-accent">{step.n}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-xl">{step.title}</h3>
                    <StatusBadge status={step.status} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

export function HomeProductBoundary() {
  return (
    <Section
      id="product-boundary"
      eyebrow="Product boundary"
      title="An operations console. Not a public chatbot."
      lede="Quesar is for teams that need account-scoped access, explicit consent, and sealed conversation records on one request path."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {homeProductBoundary.map((item) => (
          <Surface key={item.title}>
            <h3 className="font-display text-xl">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{item.body}</p>
          </Surface>
        ))}
      </div>
      <div className="mt-12">
        <p className="eyebrow">Docs</p>
        <h3 className="mt-3 font-display text-2xl tracking-tight">Start with the trust boundary.</h3>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {homeDocsDoors.map((door) => (
            <AppLink key={door.href} to={door.href} className="no-underline">
              <Surface hover className="flex h-full min-h-44 flex-col">
                <h4 className="font-display text-xl text-fg">{door.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{door.body}</p>
                <span className="mt-auto pt-5 text-sm text-accent">Open →</span>
              </Surface>
            </AppLink>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** Record tags and dates are stored uppercase; the page sets them as prose. */
function sentenceCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function HomeResearchPreview() {
  const featured = research.publications.slice(0, 3);
  return (
    <section id="research-preview" aria-labelledby="research-preview-title" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-12">
        <header className="lg:col-span-5">
          <p className="eyebrow">Research</p>
          <h2 id="research-preview-title" className="section-title mt-4">
            Architecture before adjectives.
          </h2>
          <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-fg-muted">
            Selected work on traceable retrieval, governed agents and operational AI safety.
          </p>
          <Link to="/research" className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline">
            Open the research archive
          </Link>
        </header>
        <ol className="min-w-0 divide-y divide-border border-y border-border lg:col-span-7">
          {featured.map((item) => (
            <li key={item.slug}>
              <Link to="/research/$slug" params={{ slug: item.slug }} className="group block py-6 no-underline">
                <span className="text-sm text-fg-muted">
                  {sentenceCase(item.tag)}, {sentenceCase(item.date)}
                </span>
                <span className="mt-1.5 block font-display text-xl leading-tight tracking-tight text-fg group-hover:text-accent">
                  {item.title}
                </span>
                <span className="mt-2 line-clamp-3 block text-[0.9375rem] leading-relaxed text-fg-muted">
                  {item.abstract}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HomeCta() {
  return (
    <section aria-labelledby="quesar-cta-heading" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <Surface accent="wdbx" className="p-8 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="eyebrow">Console</p>
              <h2 id="quesar-cta-heading" className="section-title mt-4">
                Put one governed workflow through Quesar.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-fg-muted">
                Signed-in accounts can enter the console. Teams can request a scoped evaluation with the workflow,
                failure modes, and data boundary made explicit.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg">
                <Link to="/get-started">
                  Get started <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">Start an inquiry</Link>
              </Button>
            </div>
          </div>
        </Surface>
      </div>
    </section>
  );
}
