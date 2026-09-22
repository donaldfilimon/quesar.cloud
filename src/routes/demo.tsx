import { createFileRoute } from "@tanstack/react-router";
import { PersonaRouter } from "@/components/apps/persona-router";
import { NamedGrid, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/demo")({
  head: () =>
    pageHead(
      "Demo — persona router",
      "Live illustrative persona router for Abbey, Aviva, and Abi. Not a trained classifier.",
    ),
  component: DemoPage,
});

function DemoPage() {
  return (
    <>
      <PageHero
        eyebrow="Demo"
        title="Watch Abi route in real time."
        lede="Type a message. A keyword-sentiment heuristic scores the blend coefficient α. The inspected local router uses deterministic rules; this demo is illustrative, not evidence of a learned classifier."
      />
      <Section>
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
        primary={{ to: "/abbey-bot", label: "Companion thread" }}
        next={[
          { to: "/abbey", label: "Abbey", body: "The product those personas sit inside." },
          { to: "/architecture", label: "Architecture", body: "Where routing is named as a node." },
        ]}
      />
    </>
  );
}
