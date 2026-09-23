import { createFileRoute } from "@tanstack/react-router";
import {
  ClaimList,
  CodeBlock,
  CommandList,
  CopyGrid,
  NamedGrid,
  PageClose,
  PageHero,
  Section,
} from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import { abiCli, abiCrates, abiDuties, abiNotClaimed, mcpTools } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/abi")({
  head: () =>
    pageHead(
      "ABI — Orchestration and inspectable context",
      "ABI is MLAI's local nightly Rust framework for routing assistant requests, assembling inspectable context, and reporting capabilities honestly.",
    ),
  component: AbiPage,
});

function AbiPage() {
  return (
    <>
      <PageHero
        eyebrow="ABI"
        title="Orchestration you can inspect on your machine."
        lede="ABI routes requests, assembles context, and coordinates tools. The public GitHub tree is nightly Rust. The Zig tree has been removed. WDBX is a required sibling. Follow the repository README — do not mix toolchains. Local template completion does not establish model quality."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <StatusBadge status="current" />
          <span className="text-sm text-fg-muted">Requires the sibling WDBX workspace.</span>
        </div>
      </PageHero>

      <Section eyebrow="Responsibilities" title="What ABI actually does.">
        <CopyGrid items={abiDuties.map((item) => ({ ...item, accent: "abi" as const }))} />
      </Section>

      <Section
        eyebrow="Public tree"
        title="Nightly Rust. Use the repo wrappers."
        lede="Bare cargo is the wrong entry. ./tools/cargo.sh pins the toolchain the tree actually builds with."
      >
        <CodeBlock
          label="donaldfilimon/abi"
          code={`git clone https://github.com/donaldfilimon/wdbx
git clone https://github.com/donaldfilimon/abi
cd abi
./tools/cargo.sh
./tools/check.sh
./tools/cargo.sh build -p abi-cli`}
        />
        <p className="mt-4 text-sm text-fg-muted">
          GPU reporting returns <code className="font-mono">accelerated=false</code> when native kernels are not linked.
          Persistence defaults to <code className="font-mono">$HOME/.abi/wdbx</code>. Disable with{" "}
          <code className="font-mono">ABI_WDBX_PERSIST=0</code>. License: Apache-2.0.
        </p>
      </Section>

      <Section eyebrow="Crates" title="What the workspace actually ships.">
        <NamedGrid items={abiCrates} accent="abi" nameClass="text-abi" />
      </Section>

      <Section
        eyebrow="MCP"
        title="Contract-covered tools, not a hosted SDK."
        lede="stdio is the default. Optional loopback HTTP uses bearer auth. Persistent HTTP+SSE is not claimed. Tool names are from the ABI README."
      >
        <NamedGrid items={mcpTools} nameClass="text-abi" />
      </Section>

      <Section
        eyebrow="CLI"
        title="Commands the public tree actually documents."
        lede="Copied from donaldfilimon/abi. Local template completion does not establish model quality."
      >
        <CommandList rows={abiCli} />
        <div className="mt-6">
          <CodeBlock
            label="abi-cli"
            code={`$ABI backends
$ABI scheduler status
$ABI dashboard --once --plain
$ABI complete "summarize ABI scheduler status"
$ABI agent plan "stage a safe WDBX refactor"
$ABI help --json`}
          />
        </div>
      </Section>

      <Section
        eyebrow="External claims"
        title="Do not cite what the ledger does not prove."
        lede="External collateral should cite a repository test, a benchmark artifact, or a documented source file before making a performance or capability claim."
      >
        <ClaimList items={abiNotClaimed} />
      </Section>

      <PageClose
        primary={{ to: "/docs/runtime", label: "ABI setup" }}
        secondary={[{ to: "/products/abi", label: "ABI product" }]}
        next={[
          { to: "/wdbx", label: "WDBX", body: "The required sibling substrate." },
          { to: "/developers", label: "Developers", body: "Gates, wrappers, and live GitHub." },
        ]}
      />
    </>
  );
}
