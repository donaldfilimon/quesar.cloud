import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, PageClose, PageHero, Section } from "@/components/site";
import { startJourneys } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/get-started")({
  head: () =>
    pageHead("Get started — Quesar", "Start journeys for research, Abbey, mobile, and Quasar without leaving this site."),
  component: GetStartedPage,
});

function GetStartedPage() {
  return (
    <>
      <PageHero
        eyebrow="Get started"
        title="Pick a journey. Stay here."
        lede="Orientation on this site. Setup commands live on the matching app and docs pages — not as a redirect away."
      />
      <Section>
        <CopyGrid
          items={startJourneys.map((item) => ({
            title: item.title,
            body: item.description,
            kicker: item.availability,
            note: item.prerequisites,
            href: item.href,
          }))}
        />
      </Section>
      <PageClose
        primary={{ to: "/docs/getting-started", label: "Docs: getting started" }}
        next={[
          { to: "/architecture", label: "Architecture", body: "Click a node for current versus not claimed." },
          { to: "/apps", label: "Apps", body: "Working orientations of the shipping surfaces." },
        ]}
      />
    </>
  );
}
