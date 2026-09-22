import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section } from "@/components/site";
import { Trailer } from "@/components/site/trailer";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/showcase/film")({
  head: () => pageHead("Film — Showcase", "Quesar atmosphere film. Not a benchmark."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHero
        eyebrow="Film"
        title="The longer look."
        lede="Wafer, then board, then the mark again if you want it. Atmosphere only. Status stays on the architecture page."
        atmosphere="none"
        compact
      />
      <Section className="!pt-10">
        <Trailer full start="wafer" />
      </Section>
      <PageClose
        primary={{ to: "/showcase", label: "Showcase" }}
        next={[{ to: "/architecture", label: "Architecture", body: "Status lives on the diagram, not in the film." }]}
      />
    </>
  );
}
