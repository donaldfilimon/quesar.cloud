import { createFileRoute } from "@tanstack/react-router";
import { MetricCard, PageClose, PageHero, Section } from "@/components/site";
import { wdbxSpecs } from "@/lib/content";
import { ProvTag } from "@/components/site/prov-tag";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/benchmarks")({
  head: () =>
    pageHead(
      "Benchmarks — Quesar",
      "Configuration facts and workload notes. Not a borrowed scoreboard.",
    ),
  component: BenchmarksPage,
});

function BenchmarksPage() {
  return (
    <>
      <PageHero
        eyebrow="Benchmarks"
        title="No borrowed numbers."
        lede="Graph defaults are configuration. Recall, QPS, and latency do not appear unless a named artifact produced them. Nothing on this page is a vendor comparison."
      >
        <div className="mt-6">
          <ProvTag tag="measured" />
        </div>
      </PageHero>
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {wdbxSpecs.map((row) => (
            <MetricCard key={row.k} k={row.k} v={row.v} />
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm text-fg-muted">
          Reproduce on your hardware. Record commit, toolchain, and output. A green web check is not GPU evidence.
        </p>
      </Section>
      <PageClose
        primary={{ to: "/research", label: "Research" }}
        next={[{ to: "/wdbx", label: "WDBX", body: "The substrate these configuration facts describe." }]}
      />
    </>
  );
}
