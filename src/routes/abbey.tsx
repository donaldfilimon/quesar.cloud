import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BulletSurface,
  CodeBlock,
  CommandList,
  CopyGrid,
  PageClose,
  PageHero,
  PersonaGrid,
  Section,
  SpecList,
  StatGrid,
} from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import { ProvTag } from "@/components/site/prov-tag";
import { Button } from "@/components/ui/button";
import { abbeyCommands, abbeyLedger, abbeyWorkflow, abbeyWorkspaceFacts } from "@/lib/content";
import { companionPersonas } from "@/lib/mlai/categories/personas";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/abbey")({
  head: () =>
    pageHead(
      "Abbey — Adaptive assistant on MLAI architecture",
      "Abbey is the adaptive assistant experience on Quesar: a local document workspace and a CLI/TUI companion that will not claim what the ledger cannot prove.",
    ),
  component: AbbeyPage,
});

function AbbeyPage() {
  return (
    <>
      <PageHero
        eyebrow="Abbey"
        title="Intelligence Without Limits — with a claims ledger."
        lede="Abbey is the human-facing surface on MLAI architecture. Simple picture first: a local workspace with assistant context. Technical picture: a claims-honest companion over ABI and WDBX. That line belongs to Abbey, not to Quesar. This website does not provision an assistant session."
      >
        <div className="mt-6">
          <StatusBadge status="current" />
        </div>
      </PageHero>

      <Section
        eyebrow="Simple"
        title="A local document workspace with assistant context."
        lede="The website-app in the integration repository is the workspace you run yourself. A local model is optional. Follow that app's own setup and account boundaries."
      >
        <BulletSurface items={abbeyWorkspaceFacts} />
        <div className="mt-6">
          <Button asChild>
            <Link to="/workspace">Abbey workspace</Link>
          </Button>
        </div>
      </Section>

      <Section
        eyebrow="Personas"
        title="Abbey, Aviva, Abi — profiles, not products."
        lede="Routing is a design mechanism described in the ABI tree. Per-persona quality is evaluated, not assumed. Product ABI is violet; persona Abi is cyan."
      >
        <PersonaGrid />
        <p className="mt-6 text-sm text-fg-subtle">
          The Abbey CLI uses a different persona axis — Gemma interprets, Max implements — carried
          by prompts under fm and abi backends. Those are not distinct models and not a second
          product line.
        </p>
        <div className="mt-4">
          <CopyGrid
            items={companionPersonas.map((p) => ({
              title: p.name,
              body: p.body,
              kicker: "CLI persona",
            }))}
          />
        </div>
      </Section>

      <Section
        eyebrow="Technical"
        title="Companion, ledger, refusal."
        lede="The Abbey CLI/TUI is the companion that will not claim what the ledger cannot prove. WDBX is optional memory, off by default, with SQLite as the default store."
      >
        <StatGrid
          columns="sm:grid-cols-5"
          cells={[
            { k: "Current", v: String(abbeyLedger.current) },
            { k: "Partial", v: String(abbeyLedger.partial) },
            { k: "Proposed", v: String(abbeyLedger.proposed) },
            { k: "Blocked", v: String(abbeyLedger.blocked) },
            { k: "Out of scope", v: String(abbeyLedger.outOfScope) },
          ]}
        />
        <p className="mt-4 mb-6 text-sm text-fg-muted">
          Enumerated with evidence in <code className="font-mono">{abbeyLedger.source}</code>,
          schema {abbeyLedger.schema}, digest{" "}
          <code className="font-mono text-[11px] break-all">{abbeyLedger.digest}</code>.{" "}
          <ProvTag tag="reported" className="ml-1 align-middle" />
        </p>
        <StatGrid
          cells={[
            { k: "Goals", v: String(abbeyWorkflow.goals) },
            { k: "Done", v: String(abbeyWorkflow.done) },
            { k: "Checked todos", v: String(abbeyWorkflow.checked) },
            { k: "Open todos", v: String(abbeyWorkflow.open) },
          ]}
        />
        <p className="mt-4 mb-6 text-sm text-fg-subtle">
          Executable workflow ledger from <code className="font-mono">{abbeyWorkflow.source}</code>:{" "}
          {abbeyWorkflow.done} done, {abbeyWorkflow.inProgress} in progress,{" "}
          {abbeyWorkflow.proposed} proposed, {abbeyWorkflow.blocked} blocked.{" "}
          <ProvTag tag="reported" className="ml-1 align-middle" />
        </p>
        <SpecList
          rows={[
            { k: "Toolchain", v: abbeyLedger.toolchain },
            { k: "Backends", v: abbeyLedger.backends.join(" · ") },
            { k: "Default memory", v: "SQLite" },
            { k: "WDBX backend", v: "opt-in feature flag" },
          ]}
        />
        <div className="mt-6">
          <CommandList rows={abbeyCommands} />
        </div>
        <div className="mt-6">
          <CodeBlock
            label="donaldfilimon/abbey"
            code={`./install.sh
abbey claims
abbey memory search "deploy target"
# optional WDBX backend
ABBEY_CARGO_FEATURES=wdbx cargo build --release`}
          />
        </div>
      </Section>

      <PageClose
        primary={{ to: "/workspace", label: "Abbey workspace" }}
        secondary={[{ to: "/abbey-bot", label: "abbey-bot" }]}
        next={[
          {
            to: "/architecture",
            label: "Architecture",
            body: "See where Abbey sits in the stack.",
          },
          { to: "/developers", label: "Developers", body: "Setup and claims-ledger source." },
        ]}
      />
    </>
  );
}
