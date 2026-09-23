import { createFileRoute } from "@tanstack/react-router";
import { ChipRow, HeroStatus, NamedGrid, PageClose, PageHero, Section } from "@/components/site";
import { frozenCli } from "@/lib/catalog";
import { pageHead } from "@/lib/seo";

const packs = [
  {
    name: "claims",
    body: "Ledger language, status labels, and refusal copy used across Abbey and this site.",
  },
  { name: "wdbx-tools", body: "Scripts consumed by ABI sync. Not a hosted plugin store." },
  { name: "site-integrity", body: "Apple sentence, provenance tags, Apache-2.0, toolchain facts." },
  { name: "mcp-allowlist", body: "Contract-covered tool names. Unknown tools fail closed." },
];

export const Route = createFileRoute("/plugins")({
  head: () =>
    pageHead(
      "Plugins — ABI",
      "abi-mega: skills, assets, and scripts consumed by ABI sync. Founder tooling, not a marketplace.",
    ),
  component: PluginsPage,
});

function PluginsPage() {
  return (
    <>
      <PageHero
        eyebrow="Plugins"
        title="Skills the runtime actually loads."
        lede="abi-mega: skills, assets, and scripts consumed by /sync-clis. Founder tooling, not a hosted marketplace."
      >
        <HeroStatus status="partial" />
      </PageHero>
      <Section>
        <NamedGrid items={packs} nameClass="text-abi" />
        <p className="mt-10 text-xs text-fg-subtle">Frozen CLI surface</p>
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
