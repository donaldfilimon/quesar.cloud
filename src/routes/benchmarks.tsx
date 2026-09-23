import { createFileRoute } from "@tanstack/react-router";
import { CosineSimDemo } from "@/components/demos/cosine-sim-demo";
import { ShardingLatencyDemo } from "@/components/demos/sharding-latency-demo";
import { CopyGrid, DataTable, MetricCard, PageClose, PageHero, Section } from "@/components/site";
import { ProvTag } from "@/components/site/prov-tag";
import { benchmarkArchitecture, benchmarkFraming, wdbxFacts } from "@/lib/mlai/pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/benchmarks")({
  head: () =>
    pageHead(
      "Benchmarks — Quesar",
      "Configuration facts, interactive models and workload notes. Not a borrowed scoreboard.",
    ),
  component: BenchmarksPage,
});

function BenchmarksPage() {
  return (
    <>
      <PageHero
        eyebrow="Benchmarks"
        title="No borrowed numbers."
        lede="How WDBX retrieval and agent orchestration are built, with interactive models and source-backed properties. Performance figures stay unpublished until a reproducible harness and methodology exist. Nothing on this page is a vendor comparison."
      >
        <div className="mt-6">
          <ProvTag tag="measured" />
        </div>
      </PageHero>
      <Section eyebrow="Framing" title="Benchmarks with operating context.">
        <CopyGrid items={benchmarkFraming} columns="md:grid-cols-3" />
      </Section>
      <Section
        eyebrow="Architecture, not adjectives"
        title="What the active WDBX substrate implements."
        lede="Properties verified against the active sibling Rust substrate. These are structural facts, not performance figures."
      >
        <DataTable
          rows={benchmarkArchitecture}
          rowKey={(row) => row.property}
          columns={[
            {
              header: "Source-backed property",
              className: "text-fg-muted",
              cell: (row) => row.property,
            },
            {
              header: "WDBX implementation",
              className: "font-mono text-[12px] text-fg",
              cell: (row) => row.value,
            },
          ]}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wdbxFacts.map((row) => (
            <MetricCard key={row.k} k={row.k} v={row.v} />
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm text-fg-muted">
          Reproduce on your hardware. Record commit, toolchain, and output. A green web check is not
          GPU evidence.
        </p>
      </Section>
      <Section eyebrow="Interactive" title="Models you can move.">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 font-display text-xl">Parallel retrieval model</h3>
            <ShardingLatencyDemo />
          </div>
          <div>
            <h3 className="mb-4 font-display text-xl">Cosine similarity, felt</h3>
            <CosineSimDemo />
          </div>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/research", label: "Research" }}
        next={[
          { to: "/wdbx", label: "WDBX", body: "The substrate these configuration facts describe." },
        ]}
      />
    </>
  );
}
