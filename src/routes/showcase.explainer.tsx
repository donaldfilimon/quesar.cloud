import { createFileRoute } from "@tanstack/react-router";
import { ChipCutaway } from "@/components/diagram/chip-cutaway";
import { PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/showcase/explainer")({
  head: () => pageHead("Explainer — Showcase", "Three layers on one chip: WDBX, ABI, Abbey."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHero
        eyebrow="Explainer"
        title="Storage. Compute. Application."
        lede="WDBX, ABI, Abbey. Select a die."
        atmosphere="plates"
      />
      <Section>
        <ChipCutaway />
      </Section>
      <PageClose
        primary={{ to: "/platform", label: "Platform" }}
        secondary={[{ to: "/showcase", label: "Showcase" }]}
        next={[{ to: "/architecture", label: "Architecture", body: "The same stack, named as nodes." }]}
      />
    </>
  );
}
