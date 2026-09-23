import { createFileRoute, Link } from "@tanstack/react-router";
import { ChipCutaway } from "@/components/diagram/chip-cutaway";
import { DataTable, PageClose, PageHero, PersonaGrid, Section, SpecList, Surface } from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import { HomeControlPlane, HomeProductBoundary } from "@/components/site/home-sections";
import { integrationApps, layers, wdbxSpecs } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/platform")({
  head: () =>
    pageHead(
      "Platform — three layers, one chip",
      "MLAI's platform stack: WDBX storage, ABI compute, Abbey application, and Quesar as the product envelope. Product accents and persona colors stay on separate axes.",
    ),
  component: PlatformPage,
});

function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow="Platform"
        title="Inference, index, and data on machines you own."
        lede="Three layers on one chip: WDBX stores, ABI coordinates, Abbey speaks. Quesar is the product envelope that makes those relationships obvious. Gama is a founder-owned Swift framework — related by author, not claimed as a Quesar surface."
      />

      <Section eyebrow="Stack" title="Bottom to top.">
        <div className="mb-10">
          <ChipCutaway />
        </div>
        <div className="grid gap-4">
          {layers.map((layer) => (
            <Link key={layer.name} to={layer.href} className="no-underline">
              <Surface hover accent={layer.accent} className="grid gap-3 sm:grid-cols-[8rem_1fr] sm:items-baseline">
                <p className="text-xs text-fg-subtle">{layer.layer}</p>
                <div>
                  <h3 className="font-display text-2xl">{layer.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{layer.body}</p>
                </div>
              </Surface>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Integration home"
        title="Independent gates. One layout."
        lede="From donaldfilimon/MLAI-CORPORATION-WWW. A green web gate is not mobile evidence."
      >
        <DataTable
          rows={integrationApps}
          rowKey={(row) => row.path}
          columns={[
            { header: "Path", className: "font-mono text-[12px]", cell: (row) => row.path },
            { header: "Purpose", className: "text-fg-muted", cell: (row) => row.purpose },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </Section>

      <Section
        eyebrow="Personas vs products"
        title="Two color axes. Do not mix them."
        lede="Product accents: WDBX cyan, ABI violet, Abbey emerald. Persona colors: Abbey emerald, Aviva violet, Abi cyan. The ABI product is violet; the Abi persona is cyan."
      >
        <PersonaGrid />
      </Section>

      <Section eyebrow="Configuration" title="What the active crate actually sets." lede="Sourced from the Rust substrate. Not a scoreboard.">
        <SpecList rows={wdbxSpecs} />
      </Section>

      <Section eyebrow="Related" title="Gama is not Quesar.">
        <Surface>
          <h3 className="font-display text-xl">Gama</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
            A modular declarative Swift UI framework with TUI, Apple, WebAssembly, and embed backends. It lives at{" "}
            <Link to="/gama" className="text-accent">
              Gama
            </Link>
            . It is not a Quesar product, not an Abbey runtime, and not evidence of a shipped spatial engine.
          </p>
        </Surface>
      </Section>
      <HomeControlPlane />
      <HomeProductBoundary />
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        secondary={[{ to: "/quesar", label: "Quesar" }]}
        next={[
          { to: "/abi", label: "ABI", body: "Nightly Rust orchestration." },
          { to: "/abbey", label: "Abbey", body: "The claims-honest companion." },
        ]}
      />
    </>
  );
}
