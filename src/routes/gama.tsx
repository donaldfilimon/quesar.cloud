import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, HeroStatus, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/gama")({
  head: () =>
    pageHead(
      "Gama — founder Swift UI framework",
      "Gama is a modular declarative Swift UI framework. Founder-owned. Not a Quesar product claim.",
    ),
  component: GamaPage,
});

function GamaPage() {
  return (
    <>
      <PageHero
        eyebrow="Gama"
        title="One tree. Many surfaces."
        lede="A modular declarative UI framework in Swift, organized around scenes and a retained render tree. Founder-owned. Not a Quesar product, not an Abbey runtime, and not evidence of a shipped spatial engine."
      >
        <HeroStatus status="research" />
      </PageHero>
      <Section>
        <CopyGrid
          items={[
            {
              title: "GamaCore",
              body: "Scenes, state, layout, and events. The retained tree is the contract.",
            },
            {
              title: "Backends",
              body: "Documented: TUI, Apple, WebAssembly, embed. Check current source for your target.",
            },
            {
              title: "MLX track",
              body: "On-device language-model work on Apple Silicon lives in related founder trees — not as a Quesar claim.",
            },
            {
              title: "Boundary",
              body: "A passing web gate is not Swift evidence. A local runtime test does not validate a mobile app.",
            },
          ]}
        />
      </Section>
      <PageClose
        primary={{ to: "/docs/gama", label: "Gama docs" }}
        next={[
          {
            to: "/projects/gama",
            label: "Project card",
            body: "Scope and the limit, on one page.",
          },
          { to: "/apps", label: "Apps", body: "Founder surfaces, labeled as research." },
        ]}
      />
    </>
  );
}
