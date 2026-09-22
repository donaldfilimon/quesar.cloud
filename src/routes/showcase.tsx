import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { ShowcaseWall } from "@/components/site/showcase-wall";
import { Trailer } from "@/components/site/trailer";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/showcase")({
  head: () => pageHead("Showcase — Quesar", "Quesar showcase: trailer, film, explainer, design lab, Abbey, mega board."),
  component: ShowcasePage,
});

function ShowcasePage() {
  return (
    <RouteFrame>
      <PageHero
        eyebrow="Showcase"
        title="Look, then inspect."
        lede="The projection room. Films and trailers drawn frame by frame by a timeline engine in your browser, narrated by the three Quesar minds. Atmosphere is not evidence: the films are orientation, and status lives on the product pages."
      />
      <Section>
        <Trailer />
        <div className="mt-10">
          <ShowcaseWall />
        </div>
      </Section>
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        next={[
          { to: "/quesar", label: "Quesar", body: "The product that the film orients." },
          { to: "/apps", label: "Apps", body: "Working surfaces, not stills." },
        ]}
      />
    </RouteFrame>
  );
}
