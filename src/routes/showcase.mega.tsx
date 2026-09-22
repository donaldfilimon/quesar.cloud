import { createFileRoute } from "@tanstack/react-router";
import { ArchitectureDiagram } from "@/components/diagram/architecture-diagram";
import { ChipCutaway } from "@/components/diagram/chip-cutaway";
import { RepoList } from "@/components/github/repo-list";
import { PageClose, PageHero, Section } from "@/components/site";
import { Trailer } from "@/components/site/trailer";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/showcase/mega")({
  head: () => pageHead("Mega — Showcase", "Full Quesar orientation board."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHero eyebrow="Mega" title="The whole board." lede="Film, chip, architecture, source. Still not a hosted session." />
      <Section>
        <Trailer />
        <div className="mt-12">
          <ChipCutaway />
        </div>
        <div className="mt-12">
          <ArchitectureDiagram compact />
        </div>
        <div className="mt-12">
          <RepoList compact />
        </div>
      </Section>
      <PageClose
        primary={{ to: "/", label: "Home" }}
        next={[
          { to: "/architecture", label: "Architecture", body: "Inspect a node." },
          { to: "/developers", label: "Developers", body: "Live READMEs when GitHub answers." },
        ]}
      />
    </>
  );
}
