import { createFileRoute } from "@tanstack/react-router";
import { CellMachine } from "@/components/apps/cell-machine";
import { HeroStatus, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/cell-machine")({
  head: () =>
    pageHead(
      "Cell machine — research automaton",
      "Playable cellular automaton. Founder research, not a Quesar product surface.",
    ),
  component: CellMachinePage,
});

function CellMachinePage() {
  return (
    <>
      <PageHero
        eyebrow="Cell machine"
        title="A grid that keeps its own time."
        lede="Conway-style cellular automaton, playable here. Research experiment. Not a Quesar product, not a hosted world, and not evidence of a shipped simulation engine."
      >
        <HeroStatus status="research" />
      </PageHero>
      <Section>
        <CellMachine />
      </Section>
      <PageClose
        primary={{ to: "/apps", label: "Apps" }}
        next={[
          { to: "/source/cell-machine", label: "Source note", body: "The public tree this experiment belongs to." },
          { to: "/research", label: "Research", body: "Other founder and lab work, labeled as such." },
        ]}
      />
    </>
  );
}
