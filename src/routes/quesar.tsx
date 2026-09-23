import { createFileRoute, Link } from "@tanstack/react-router";
import { QuasarStudio } from "@/components/apps/quasar-studio";
import { CodeBlock, CopyGrid, DataTable, PageClose, PageHero, Section, StepList } from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import { Button } from "@/components/ui/button";
import { quesarSurfaces, quesarWhat } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/quesar")({
  head: () =>
    pageHead(
      "Quesar — MLAI infrastructure for persistent AI",
      "Quesar is MLAI's infrastructure for persistent, adaptive AI systems — orchestration, private memory, and interoperable compute.",
    ),
  component: QuesarPage,
});

function QuesarPage() {
  return (
    <>
      <PageHero
        eyebrow="Quesar"
        title="Infrastructure for private, persistent, adaptive AI."
        lede="Quesar is the product experience that connects ABI, WDBX, and Abbey. It is not a chatbot, not a vector database, and not a hosted wrapper around a public model."
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StatusBadge status="partial" />
          <span className="text-sm text-fg-muted">
            Public orientation and a signed-in console are current. Hosted assistant sessions are not.
          </span>
        </div>
      </PageHero>

      <Section
        eyebrow="What it is"
        title="A system you can place, inspect, and bound."
        lede="Quesar exists because intelligence that forgets you at the end of every session is not a foundation you can build on — and intelligence that requires you to surrender memory to a remote cluster is not a foundation you should have to accept."
      >
        <CopyGrid items={quesarWhat} />
      </Section>

      <Section
        eyebrow="Name"
        title="Quesar is the product. Quasar is the local builder."
        lede="They are not interchangeable. This repository keeps the builder service at sidecars/quasar-service and its screens at /quasar/sites; the website is this app."
      >
        <CopyGrid
          items={[
            {
              title: "Quesar",
              body: "The infrastructure product: orchestration, private memory, local compute. This site is orientation for that product.",
              accent: "accent",
            },
            {
              title: "Quasar",
              body: "A local v1 website builder: generate a Next.js project and preview it on your own machine. Bun 1.4, Anthropic credentials, a service and Expo app. Hosting, deploy adapters, and builder authentication are outside this version.",
            },
          ]}
        />
      </Section>

      <Section
        eyebrow="Quasar v1"
        title="Four parts. Preview means next dev on your machine."
        lede="From the integration README. Unit suite is not a live Anthropic generation."
      >
        <StepList
          steps={[
            {
              title: "packages/shared",
              body: "TypeScript types and zod schemas shared by the service and the Expo app — Site, GenerationEvent, PreviewStatus, request bodies.",
            },
            {
              title: "sidecars/quasar-service",
              body: "Local Bun service (default port 4700): registry, path guard, site filesystem tools, generation engine, scaffolder, preview manager.",
            },
            {
              title: "templates/next-site",
              body: "A buildable, checked-in Next.js 16 + Tailwind v4 starter, copied per-site as the generation baseline. Own lockfile, outside the root workspace.",
            },
            {
              title: "/quasar screens",
              body: "Sites, new site, site detail with live events and preview, and settings, in this app. They call the local service from your browser. There is no deploy step in v1.",
            },
          ]}
        />
        <div className="mt-6">
          <CodeBlock
            label="sidecars/quasar-service"
            code={`bun run --cwd sidecars/quasar-service start
# LAN service has no auth — trusted network only
# see sidecars/quasar-service/README.md`}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/quasar/sites"
            className="inline-flex h-10 items-center rounded-md bg-fg px-4 text-sm font-medium text-bg no-underline"
          >
            Open your sites
          </Link>
          <Link
            to="/quasar/new"
            className="inline-flex h-10 items-center rounded-md bg-bg-elevated px-4 text-sm font-medium text-fg no-underline shadow-[var(--shadow-border)]"
          >
            New site
          </Link>
          <Link
            to="/quasar/settings"
            className="inline-flex h-10 items-center rounded-md px-4 text-sm text-fg-muted no-underline hover:text-fg"
          >
            Service settings
          </Link>
        </div>
        <div className="mt-6">
          <QuasarStudio />
        </div>
      </Section>

      <Section eyebrow="Surfaces" title="What exists in public source today.">
        <DataTable
          rows={quesarSurfaces}
          rowKey={(row) => row.surface}
          columns={[
            { header: "Surface", cell: (row) => <span className="font-medium">{row.surface}</span> },
            { header: "Role", className: "text-fg-muted", cell: (row) => row.role },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
        <p className="mt-4 text-sm text-fg-subtle">
          The builder service listens on the LAN without authentication — run it only on a network you trust. In-browser
          studio above. Setup notes:{" "}
          <Link to="/docs/$slug" params={{ slug: "getting-started" }} className="text-accent">
            getting started
          </Link>
          .
        </p>
      </Section>

      <Section eyebrow="Next" title="Inspect the layers.">
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/architecture">Architecture</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/platform">Platform</Link>
          </Button>
        </div>
      </Section>
      <PageClose
        next={[
          { to: "/wdbx", label: "WDBX", body: "The memory substrate under the product." },
          { to: "/abi", label: "ABI", body: "Nightly Rust orchestration." },
        ]}
      />
    </>
  );
}
