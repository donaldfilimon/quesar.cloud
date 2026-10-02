import { createFileRoute } from "@tanstack/react-router";
import { ChipRow, HeroStatus, NamedGrid, PageClose, PageHero, Section } from "@/components/site";
import { frozenCli } from "@/lib/catalog";
import { pageHead } from "@/lib/seo";

const packs = [
  {
    name: "claims",
    body: "Proposed grouping for capability-ledger language, status labels, and review boundaries.",
  },
  { name: "wdbx-tools", body: "Proposed grouping for WDBX integration tools and scripts." },
  {
    name: "site-integrity",
    body: "Site integrity concepts: source references, provenance tags, named repository licenses, and toolchain facts.",
  },
  {
    name: "mcp-allowlist",
    body: "Proposed grouping for source-defined MCP tools and permission review.",
  },
];

export const Route = createFileRoute("/plugins")({
  head: () =>
    pageHead(
      "Plugins — ABI",
      "Orientation to plugin and CLI concepts; synchronized installation requires separate source and acceptance evidence.",
    ),
  component: PluginsPage,
});

function PluginsPage() {
  return (
    <>
      <PageHero
        eyebrow="Plugins"
        title="Explore plugin and CLI concepts."
        lede="Orientation to plugin and CLI concepts; synchronized installation requires separate source and acceptance evidence."
      >
        <HeroStatus status="partial" />
      </PageHero>
      <Section>
        <NamedGrid items={packs} nameClass="text-abi" />
        <p className="mt-10 text-xs text-fg-subtle">CLI names shown in this orientation</p>
        <div className="mt-3">
          <ChipRow items={frozenCli} />
        </div>
      </Section>
      <PageClose
        primary={{ to: "/skill-creator", label: "skill-creator" }}
        secondary={[{ to: "/abi", label: "ABI" }]}
        next={[{ to: "/apps", label: "Apps", body: "Other founder and product surfaces." }]}
      />
    </>
  );
}
