import { createFileRoute } from "@tanstack/react-router";
import { PersonaRouter } from "@/components/apps/persona-router";
import { WdbxLiveDemo } from "@/components/demos/wdbx-live-demo";
import { NamedGrid, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/demo")({
  head: () =>
    pageHead(
      "Live demo — WDBX in-browser miniature",
      "Run an in-browser WDBX query-path miniature with cosine search over deterministic embeddings, an illustrative partition model, MVCC snapshots, and a hash-chained query log.",
    ),
  component: DemoPage,
});

function DemoPage() {
  return (
    <>
      <PageHero
        eyebrow="Live demo"
        title="Run the miniature."
        lede="An illustrative in-browser query model: real cosine similarity over deterministic embeddings, local partition labels, an MVCC-style snapshot counter and a block-chained query log. Everything runs in this tab, with no network and no keys."
      />
      <Section
        eyebrow="WDBX · simulated in-browser"
        title="Query a local corpus."
        lede="Simulated here: the embeddings (a 256-dimension feature hash), the corpus, the partition labels, the snapshot counter and the query chain. Measured here: the scan latency, timed in your browser. Not involved: the Rust WDBX engine or any WDBX store. The partition display is not a WDBX sharding claim."
      >
        <WdbxLiveDemo />
        <p className="mt-6 text-sm text-fg-muted">
          The source is the truth:{" "}
          <a
            href="https://github.com/donaldfilimon/wdbx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline-offset-4 hover:underline"
          >
            open the WDBX repository
          </a>
          .
        </p>
      </Section>
      <Section
        eyebrow="Persona router"
        title="Watch Abi route in real time."
        lede="Type a message. A keyword-sentiment heuristic scores the blend coefficient α. The inspected local router uses deterministic rules; this demo is illustrative, not evidence of a learned classifier."
      >
        <PersonaRouter />
        <div className="mt-8">
          <NamedGrid
            items={[
              { name: "α > 0.8", body: "Pure Abbey — empathetic, scaffolded." },
              { name: "0.2–0.8", body: "Blend — Aviva's facts, Abbey's voice, mixed by Abi." },
              { name: "α < 0.2", body: "Pure Aviva — concise, unfiltered." },
            ]}
            columns="md:grid-cols-3"
          />
        </div>
      </Section>
      <PageClose
        primary={{
          to: "/research/wdbx-weighted-backtrace-memory-store",
          label: "Read the WDBX paper",
        }}
        next={[
          {
            to: "/wdbx",
            label: "WDBX",
            body: "What the substrate is, and what it does not claim.",
          },
          { to: "/abbey-bot", label: "Companion thread", body: "Where the personas talk." },
          { to: "/architecture", label: "Architecture", body: "Where routing is named as a node." },
        ]}
      />
    </>
  );
}
