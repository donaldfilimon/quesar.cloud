import { createFileRoute } from "@tanstack/react-router";
import { DataTable, NamedGrid, PageClose, PageHero, Section, SpecList } from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import { ProvTag } from "@/components/site/prov-tag";
import { wdbxCapabilities, wdbxCrates, wdbxSpecs } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/wdbx")({
  head: () =>
    pageHead(
      "WDBX — Provenance-aware memory substrate",
      "WDBX is MLAI's provenance-aware episodic substrate: durable records, vector retrieval, causal history, and inspectable evidence beneath ABI.",
    ),
  component: WdbxPage,
});

function WdbxPage() {
  return (
    <>
      <PageHero
        eyebrow="WDBX"
        title="Memory is not a lookup."
        lede="A vector database can retrieve similar content. An episodic substrate must also preserve context, causal dependencies, outcomes, versions, constraints, and evidence — so a later query can ask what happened, what was predicted, what was done, what followed, and why this record is trusted."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <StatusBadge status="current" />
          <span className="text-sm text-fg-muted">
            Structural substrate is in source. Evidence-weighted retrieval is planned.
          </span>
        </div>
      </PageHero>

      <Section
        eyebrow="Capabilities"
        title="Implemented structure. Honest gaps."
        lede="Status is measured against the source, not against a product name. Storage integrity does not establish truth. The reference cluster protocol does not establish production sharding."
      >
        <DataTable
          minWidth="40rem"
          rows={wdbxCapabilities}
          rowKey={(row) => row.concern}
          columns={[
            { header: "Concern", cell: (row) => <span className="font-medium">{row.concern}</span> },
            { header: "What exists", className: "text-fg-muted", cell: (row) => row.what },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </Section>

      <Section
        eyebrow="Configuration"
        title="Facts from the active crate."
        lede="Not latency, not recall, not QPS. Graph construction parameters as the Rust tree sets them."
      >
        <div className="mb-4">
          <ProvTag tag="measured" />
        </div>
        <SpecList rows={wdbxSpecs} />
      </Section>

      <Section eyebrow="Crates" title="The substrate ABI owns.">
        <NamedGrid items={wdbxCrates} accent="wdbx" nameClass="text-wdbx" />
        <p className="mt-4 text-sm text-fg-subtle">
          Crate names keep the <code className="font-mono">abi-</code> prefix deliberately. ABI owns this layer. The
          repository provides source, not a hosted database. Extracted from donaldfilimon/abi on 2026-08-22 with history
          preserved. A Python witness encoder at <code className="font-mono">tools/abbey_cbor_episode_v1.py</code>{" "}
          agrees on golden vectors for <code className="font-mono">abbey-cbor-episode-v1</code>.
        </p>
      </Section>

      <PageClose
        primary={{ to: "/docs/wdbx", label: "WDBX docs" }}
        secondary={[
          { to: "/abi", label: "ABI runtime" },
          { to: "/research", label: "Research notes" },
        ]}
      />
    </>
  );
}
