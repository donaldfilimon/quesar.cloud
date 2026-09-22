import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { Trailer } from "@/components/site/trailer";
import { showcaseRooms } from "@/lib/content";
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
        lede="Atmosphere is not evidence. The film is orientation. Status lives on the product pages."
      />
      <Section>
        <Trailer />
        <div className="mt-10">
          <CopyGrid
            items={showcaseRooms.map((room) => ({ title: room.title, body: room.body, href: room.href }))}
            columns="sm:grid-cols-2 lg:grid-cols-3"
          />
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
