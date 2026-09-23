import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { changelog } from "@/lib/mlai/categories/changelog";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Quesar" },
      {
        name: "description",
        content:
          "Release history for Quesar and the MLAI stack. Presentation-layer markers aligned to documented milestones.",
      },
    ],
  }),
  component: ChangelogPage,
});

function ChangelogPage() {
  return (
    <>
      <PageHero
        eyebrow="Changelog"
        title="Milestones, not a marketing calendar."
        lede="Versions and dates are presentation-layer markers aligned to documented work. Edit freely as releases formalize."
      />
      <Section>
        <ol className="grid gap-4">
          {changelog.map((entry) => (
            <li key={entry.version}>
              <Surface>
                <p className="text-xs text-accent">
                  {entry.version} · {entry.date}
                </p>
                <h2 className="mt-2 font-display text-2xl">{entry.title}</h2>
                <ul className="mt-4 space-y-2">
                  {entry.items.map((item) => (
                    <li key={item.text} className="text-sm text-fg-muted">
                      <span className="text-xs text-fg-subtle">{item.cat}</span>
                      {" — "}
                      {item.text}
                    </li>
                  ))}
                </ul>
              </Surface>
            </li>
          ))}
        </ol>
      </Section>
      <PageClose
        primary={{ to: "/docs", label: "Docs" }}
        next={[
          { to: "/developers", label: "Developers", body: "The tree these milestones describe." },
        ]}
      />
    </>
  );
}
