import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArchitectureDiagram } from "@/components/diagram/architecture-diagram";
import { ChipCutaway } from "@/components/diagram/chip-cutaway";
import { HeroField } from "@/components/diagram/hero-field";
import { RepoList } from "@/components/github/repo-list";
import { SourcePanel } from "@/components/github/source-panel";
import { Backtrace } from "@/components/site/backtrace";
import { Button } from "@/components/ui/button";
import {
  CopyGrid,
  DataTable,
  FaqList,
  IntegrityList,
  PersonaGrid,
  ProjectRows,
  Section,
  Surface,
  TruthList,
} from "@/components/site";
import { AtmosphereMedia, Readout, Ticks } from "@/components/site/instrument";
import { Trailer } from "@/components/site/trailer";
import { StatusBadge } from "@/components/site/status-badge";
import { ProvLegend, ProvTag } from "@/components/site/prov-tag";
import { cn } from "@/lib/utils";
import {
  faqs,
  homePrivacy,
  homeProposition,
  homeStart,
  integrationApps,
  integrityRules,
  products,
  site,
  statusCopy,
  wdbxSpecs,
  type StatusKind,
} from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => pageHead(`${site.name} — Private intelligence, built around you`, site.description),
  component: Home,
});

function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MLAI Corporation",
            legalName: site.legal,
            url: "https://quesar.cloud/",
            description: site.mission,
            sameAs: [
              "https://github.com/donaldfilimon/MLAI-CORPORATION-WWW",
              "https://github.com/donaldfilimon/abi",
              "https://github.com/donaldfilimon/wdbx",
              "https://github.com/donaldfilimon/abbey",
              "https://github.com/donaldfilimon/skill-creator",
              "https://github.com/donaldfilimon/gama",
            ],
          }),
        }}
      />
      <Hero />
      <HomeJump />
      <section id="origin" className="statement-band scroll-mt-32">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="eyebrow">Origin</p>
          <blockquote className="mt-8 max-w-4xl font-display text-[1.85rem] leading-[1.18] tracking-tight italic sm:text-4xl lg:text-[2.75rem]">
            {site.origin}
          </blockquote>
        </div>
      </section>
      <Section
        id="stack"
        className="scroll-mt-32"
        eyebrow="Stack"
        title="Abbey on ABI on WDBX."
        lede="The M in the mark is a weighted directed graph. The stack is the same shape: application, compute, storage — inspectable at every node."
      >
        <ChipCutaway />
      </Section>
      <HomeArchitecture />
      <section id="trailer" className="scroll-mt-32 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="eyebrow">Trailer</p>
          <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="section-title">Infrastructure first. Then the assistant.</h2>
              <p className="mt-5 max-w-[66ch] text-lg leading-8 text-fg">
                Three cuts, played here: the mark, the wafer, and the board. Labels, not a live runtime.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/quesar">Explore Quesar</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/showcase/trailer">Full trailer</Link>
              </Button>
            </div>
          </div>
          <div className="mt-10">
            <Trailer full />
          </div>
        </div>
      </section>
      <Section eyebrow="Orientation" title="Start simple. Then inspect the machinery.">
        <TruthList items={homeProposition} />
        <div className="mt-12">
          <IntegrityList rules={integrityRules.slice(0, 3)} />
        </div>
      </Section>
      <Section
        eyebrow="Personas"
        title="Abbey, Aviva, Abi."
        lede="Three profiles share one core. Product accents and persona colors are different axes: the ABI product is violet; the Abi persona is cyan. A reader learns each color once."
      >
        <PersonaGrid />
      </Section>
      <Memory />
      <Section
        id="products"
        eyebrow="System"
        title="Three layers. One chip."
        lede="Abbey is the human-facing experience. ABI is orchestration. WDBX is the memory substrate. Quesar is the platform that makes the relationships obvious."
      >
        <ProjectRows items={products} />
      </Section>
      <Section
        eyebrow="Active Rust substrate"
        title="Retrieval facts, sourced from the implementation."
        lede="The active crate — not a frozen documentation mirror — is authoritative. These are configuration facts, not benchmark claims."
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Surface accent="wdbx" className="p-8">
            <h3 className="font-display text-3xl tracking-tight">Inspectable nearest-neighbor retrieval.</h3>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted">
              The substrate implements a layered HNSW graph, validates structure, rebuilds against real vectors in tests,
              and pairs retrieval with MVCC. It does not claim production multi-host sharding.
            </p>
            <div className="mt-6">
              <ProvTag tag="measured" />
            </div>
          </Surface>
          <dl className="surface divide-y divide-border overflow-hidden">
            {wdbxSpecs.map((row) => (
              <div key={row.k} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
                <dt className="font-mono text-[11px] tracking-wide text-fg-subtle uppercase">{row.k}</dt>
                <dd className="font-mono text-sm text-fg">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-5 text-sm text-fg-subtle">
          Graph defaults above are implementation configuration. They are not recall, QPS, or latency claims.
        </p>
      </Section>
      <Section
        eyebrow="GitHub"
        title="The public tree is the source of truth."
        lede="Live metadata from donaldfilimon when GitHub answers. Independent gates: a green web check is not mobile evidence."
      >
        <div className="mb-8">
          <SourcePanel />
        </div>
        <div className="mb-8">
          <DataTable
            rows={integrationApps}
            rowKey={(row) => row.path}
            columns={[
              { header: "Path", className: "font-mono text-[12px]", cell: (row) => row.path },
              { header: "Purpose", className: "text-fg-muted", cell: (row) => row.purpose },
              { header: "Gate", className: "font-mono text-[11px] text-fg-subtle", cell: (row) => row.gate },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </div>
        <RepoList compact />
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link to="/developers">Open the source index</Link>
          </Button>
        </div>
      </Section>
      <Section
        eyebrow="Start"
        title="What would you like to do?"
        lede="Orientation here. Setup in docs and apps. Each surface has its own gate — a green web check is not mobile evidence."
      >
        <CopyGrid items={homeStart} />
      </Section>
      <section className="relative overflow-hidden border-y border-border">
        <AtmosphereMedia still="/media/atmosphere-lab.jpg" />
        <div className="hero-vignette pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <header className="mb-12 max-w-3xl">
            <p className="eyebrow">Privacy</p>
            <h2 className="section-title mt-4">Privacy is architecture, not a slogan.</h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
              Data ownership, local processing, controlled memory, and provenance are mechanisms. They have scope. The
              scope is documented.
            </p>
          </header>
          <CopyGrid items={homePrivacy} />
          <p className="mt-8 max-w-2xl text-sm text-fg-subtle">{site.apple}</p>
        </div>
      </section>
      <Section
        eyebrow="FAQ"
        title="Short answers. No borrowed benchmarks."
        lede="Native disclosure. If a number is not in the public skill-creator master reference, it does not ship."
      >
        <FaqList items={faqs} />
      </Section>
      <Section
        eyebrow="Status"
        title="Labels are not interchangeable."
        lede="Current, Partial, Experimental, In development, Planned, and Research mean different things. Planned functionality is never presented as shipping. Figures carry a separate provenance tag."
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(statusCopy) as StatusKind[]).map((key) => (
            <li key={key} className="surface p-5">
              <StatusBadge status={key} />
              <p className="mt-2 text-sm text-fg-muted">{statusCopy[key].meaning}</p>
            </li>
          ))}
        </ul>
        <ProvLegend className="mt-8" />
      </Section>
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <p className="eyebrow">Next</p>
          <h2 className="section-title mt-4 max-w-2xl">Inspect the stack, or keep a note.</h2>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/architecture">Architecture</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/investors">Investors</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/developers">Developers</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

const HOME_JUMP = [
  { href: "#origin", label: "Origin" },
  { href: "#stack", label: "Stack" },
  { href: "#architecture", label: "Architecture" },
  { href: "#trailer", label: "Trailer" },
] as const;

function HomeJump() {
  const [active, setActive] = useState<(typeof HOME_JUMP)[number]["href"]>("#origin");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target.id) return;
        setActive(`#${visible.target.id}` as (typeof HOME_JUMP)[number]["href"]);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0.1, 0.35, 0.6] },
    );
    for (const item of HOME_JUMP) {
      const el = document.getElementById(item.href.slice(1));
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="On this page" className="sticky top-16 z-30 border-b border-border bg-bg/78 backdrop-blur-md">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {HOME_JUMP.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={active === item.href ? "location" : undefined}
              className={cn(
                "inline-flex h-11 items-center px-3 text-sm no-underline",
                active === item.href ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function HomeArchitecture() {
  const [node, setNode] = useState("quesar");
  return (
    <Section
      id="architecture"
      className="scroll-mt-32"
      eyebrow="Architecture"
      title="The interface is a window into the system."
      lede="Click a node. The inspector lists what is current in source versus what is not claimed. Select a component, then save a field note after you sign in."
    >
      <ArchitectureDiagram compact selectedId={node} onSelect={setNode} />
    </Section>
  );
}

function Hero() {
  const stage = useRef<HTMLElement>(null);

  function onMove(event: MouseEvent<HTMLElement>) {
    const el = stage.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  return (
    <section ref={stage} onMouseMove={onMove} className="hero-grid relative overflow-hidden border-b border-border">
      <AtmosphereMedia still="/media/atmosphere-wafer.jpg" video="/media/atmosphere-wafer.mp4" />
      <HeroField />
      <div className="hero-wash pointer-events-none absolute inset-0" />
      <div className="hero-vignette pointer-events-none absolute inset-0" />
      <div className="hero-spot pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:py-20">
        <Ticks />
        <div className="stagger-in relative">
          <p className="eyebrow">Quesar by MLAI</p>
          <h1 className="display-title mt-6">
            Private intelligence,
            <br />
            <em>built around you.</em>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Quesar is MLAI's infrastructure for persistent, adaptive AI — orchestration you can inspect, memory that
            keeps a chain, compute that stays on machines you own.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/quesar">Explore Quesar</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/architecture">Explore the architecture</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/developers">Read the source</Link>
            </Button>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-3 border-t border-border pt-6 sm:gap-6">
            <Readout k="Posture" v="Local-first" />
            <Readout k="Memory" v="Provenance-aware" />
            <Readout k="Source" v="Inspectable" />
          </div>
        </div>
        <div className="relative">
          <Backtrace />
        </div>
      </div>
    </section>
  );
}

function Memory() {
  return (
    <Section
      eyebrow="Memory"
      title="Sessions forget. Substrates don't."
      lede="The problem Quesar is built around is not model quality. It is that conventional assistants discard the record the moment the tab closes."
    >
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <AtmosphereMedia still="/media/atmosphere-board.jpg" video="/media/atmosphere-board.mp4" />
        <div className="hero-vignette pointer-events-none absolute inset-0" />
        <div className="relative p-5 sm:p-7">
          <p className="font-mono text-[0.65rem] tracking-[0.14em] text-accent uppercase">The problem Quesar is built around</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <article className="rounded-lg border border-border bg-card/80 p-5 backdrop-blur-sm">
              <p className="text-xs font-medium text-fg-subtle">Conventional session</p>
              <p className="mt-3 font-mono text-[0.72rem] leading-7 text-fg-muted">
                user: remember the deploy target
                <br />
                model: noted
                <br />
                <span className="text-status-partial">— session ends —</span>
                <br />
                user: what was the target
                <br />
                model: I don't have that
              </p>
            </article>
            <article className="rounded-lg border border-border bg-card/80 p-5 backdrop-blur-sm">
              <p className="text-xs font-medium text-fg-subtle">WDBX-backed context</p>
              <p className="mt-3 font-mono text-[0.72rem] leading-7 text-fg-muted">
                episode: deploy target recorded
                <br />
                provenance: signed, content-addressed
                <br />
                retrieval: causal + semantic
                <br />
                user: what was the target
                <br />
                <span className="text-status-current">context is still there</span>
              </p>
            </article>
          </div>
          <p className="mt-5 text-xs text-fg-subtle">
            Memory here is a system capability — persistence, retrieval, provenance — not a claim of sentience.
          </p>
        </div>
      </div>
    </Section>
  );
}
