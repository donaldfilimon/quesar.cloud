import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChipCutaway } from "@/components/diagram/chip-cutaway";
import { Backtrace } from "@/components/site/backtrace";
import { HomeResearchPreview } from "@/components/site/home-sections";
import { Trailer } from "@/components/site/trailer";
import { Button } from "@/components/ui/button";
import { homePrivacy, homeStart, site } from "@/lib/content";
import { wdbxFacts } from "@/lib/mlai/wdbx-facts";
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

const HOME_TITLE = `${site.name}: AI memory that can show its sources`;
const HOME_DESCRIPTION =
  "Quesar is MLAI's infrastructure for persistent AI. Every answer keeps a weighted chain back to the records it came from, on machines you own.";

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
      <Row id="problem" label="The problem" title="Sessions forget. A substrate keeps the record.">
        <Transcripts />
      </Row>
      <Row
        id="stack"
        label="The stack"
        title="Abbey runs on ABI, which runs on WDBX."
        lede="Abbey is the assistant people talk to. ABI orchestrates the work. WDBX stores every episode with its provenance. Pick a layer to see what is in source today."
        wide
      >
        <ChipCutaway />
      </Row>
      <Row
        id="retrieval"
        label="Retrieval"
        title="Configuration facts, read from the implementation."
        lede="These are the active Rust crate's settings, not recall, throughput or latency claims."
      >
        <dl className="divide-y divide-border border-y border-border">
          {wdbxFacts.map((row) => (
            <div key={row.k} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
              <dt className="text-sm text-fg-muted">{row.k}</dt>
              <dd className="font-mono text-sm text-fg">{row.v}</dd>
            </div>
          ))}
        </dl>
      </Row>
      <Row
        id="film"
        label="The film"
        title="See the system before you read about it."
        lede="A short cut of the mark, the wafer and the board. It plays when you press play, with labels rather than a live runtime."
      >
        <Trailer />
        <p className="mt-4 text-sm">
          <Link to="/showcase" className="text-accent underline-offset-4 hover:underline">
            Open the showcase rooms
          </Link>
        </p>
      </Row>
      <HomeResearchPreview />
      <Row
        id="privacy"
        label="Privacy"
        title="Privacy is a mechanism, and every mechanism has a scope."
      >
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {homePrivacy.map((item) => (
            <div key={item.title}>
              <dt className="font-display text-lg tracking-tight">{item.title}</dt>
              <dd className="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">{item.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-sm text-fg-subtle">{site.apple}</p>
      </Row>
      <StartHere />
    </>
  );
}

function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="lg:col-span-7">
          <p className="eyebrow">Quesar by MLAI</p>
          <h1 className="display-title mt-6 lg:max-w-[14ch]">AI memory that can show its sources.</h1>
          <p className="mt-7 max-w-[54ch] text-lg leading-8 text-fg-muted">
            Quesar is MLAI's infrastructure for persistent AI. Every answer keeps a weighted chain back to the records
            it came from, and the whole stack runs on machines you own.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/architecture">See how it works</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/developers">Read the source</Link>
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
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-b border-border">
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
          {lede ? <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-fg-muted">{lede}</p> : null}
        </header>
        <div className={cn("min-w-0", wide ? "" : "lg:col-span-7")}>{children}</div>
      </div>
    </section>
  );
}

function Transcripts() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="rounded-lg bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
        <figcaption className="text-sm text-fg-muted">A conventional session</figcaption>
        <p className="mt-3 font-mono text-[0.8125rem] leading-7 text-fg">
          you: remember the deploy target
          <br />
          model: noted
          <br />
          <span className="text-status-partial">session ends</span>
          <br />
          you: what was the target?
          <br />
          model: I don't have that
        </p>
      </figure>
      <figure className="rounded-lg bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
        <figcaption className="text-sm text-fg-muted">With WDBX underneath</figcaption>
        <p className="mt-3 font-mono text-[0.8125rem] leading-7 text-fg">
          episode: deploy target recorded
          <br />
          provenance: signed, content-addressed
          <br />
          retrieval: causal and semantic
          <br />
          you: what was the target?
          <br />
          <span className="text-status-current">answer cites the recorded episode</span>
        </p>
      </figure>
      <p className="text-sm text-fg-subtle sm:col-span-2">
        Memory here is a system capability: persistence, retrieval and provenance. It is not a claim of sentience.
      </p>
    </div>
  );
}

function StartHere() {
  return (
    <section aria-labelledby="start-title">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="eyebrow">Start here</p>
        <h2 id="start-title" className="section-title mt-4 max-w-[20ch]">
          Pick the door that matches why you came.
        </h2>
        <ul className="mt-10 grid border-t border-border sm:grid-cols-2">
          {homeStart.map((item) => (
            <li key={item.href} className="border-b border-border sm:odd:border-r sm:odd:pr-8 sm:even:pl-8">
              <Link to={item.href} className="group block py-6 no-underline">
                <span className="font-display text-xl tracking-tight text-fg group-hover:text-accent">{item.title}</span>
                <span className="mt-2 block text-[0.9375rem] leading-relaxed text-fg-muted">{item.body}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/get-started">Get started</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/contact">Start an inquiry</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
