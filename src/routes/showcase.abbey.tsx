import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, PersonaGrid, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/showcase/abbey")({
  head: () => pageHead("Abbey — Showcase", "Companion stills and persona language."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHero
        eyebrow="Abbey"
        title="Care first. Clarity always. Competence throughout."
        lede="Personas, not products. The ABI product is violet; the Abi persona is cyan."
        atmosphere="lab"
      />
      <Section>
        <PersonaGrid />
      </Section>
      <PageClose
        primary={{ to: "/abbey", label: "Abbey product" }}
        secondary={[{ to: "/showcase", label: "Showcase" }]}
        next={[{ to: "/demo", label: "Persona demo", body: "Watch Abi score the blend coefficient." }]}
      />
    </>
  );
}
