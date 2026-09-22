import { createFileRoute } from "@tanstack/react-router";
import { NamedGrid, PageClose, PageHero, Section, Surface } from "@/components/site";
import { Logo } from "@/components/site/logo";
import { pageHead } from "@/lib/seo";

const tokens = [
  { name: "accent", body: "Cool metal. Primary action, not a glow." },
  { name: "abi", body: "Violet. Product orchestration — not the Abi persona." },
  { name: "wdbx", body: "Emerald. Memory substrate." },
  { name: "abbey", body: "Warm rose. Companion product — Abbey persona is a separate axis." },
];

const swatch: Record<string, string> = {
  accent: "bg-accent",
  abi: "bg-abi",
  wdbx: "bg-wdbx",
  abbey: "bg-abbey",
};

export const Route = createFileRoute("/showcase/design")({
  head: () => pageHead("Design lab — Showcase", "Quesar tokens, type, and mark."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHero
        eyebrow="Design"
        title="Tokens, not a theme pack."
        lede="Cyan, violet, emerald — product accents and persona colors stay on separate axes."
      />
      <Section>
        <div className="flex items-center gap-6">
          <Logo />
          <p className="text-sm text-fg-muted">The M in the mark is a weighted directed graph.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tokens.map((token) => (
            <Surface key={token.name}>
              <div className={`h-16 rounded-md ${swatch[token.name]}`} />
              <p className="mt-2 font-mono text-[11px] uppercase">{token.name}</p>
            </Surface>
          ))}
        </div>
        <p className="mt-8 font-display text-4xl italic">Private intelligence, built around you.</p>
        <div className="mt-10">
          <NamedGrid items={tokens} columns="sm:grid-cols-2" />
        </div>
      </Section>
      <PageClose primary={{ to: "/showcase", label: "Showcase" }} next={[{ to: "/", label: "Home", body: "The same tokens on the live product." }]} />
    </>
  );
}
