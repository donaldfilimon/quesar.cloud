import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section } from "@/components/site";
import { Trailer } from "@/components/site/trailer";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/showcase/trailer")({
  head: () => pageHead("Trailer — Showcase", "Quesar trailer, played on this site."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHero
        eyebrow="Trailer"
        title="Three cuts. One sitting."
        lede="The mark, the wafer, and the board play in order. Press play, or jump a chapter. Nothing in the film is a measured result."
        atmosphere="none"
        compact
      />
      <Section className="!pt-10">
        <Trailer full />
      </Section>
      <PageClose
        primary={{ to: "/showcase", label: "Showcase" }}
        next={[
          { to: "/architecture", label: "Architecture", body: "Click a node for current versus not claimed." },
          { to: "/quesar", label: "Quesar", body: "The product the trailer orients." },
        ]}
      />
    </>
  );
}
