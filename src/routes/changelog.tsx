import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { changelog } from "@/lib/mlai/categories/changelog";
import type { Changelog } from "@/lib/mlai/schemas";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/changelog")({
  head: () =>
    pageHead(
      "Changelog — Quesar",
      "Release history for Quesar and the MLAI stack: the Rust-era milestones, with the superseded Zig history kept as an archive.",
    ),
  component: ChangelogPage,
});

function Entries({ entries }: { entries: Changelog }) {
  return (
    <ol className="grid gap-4">
      {entries.map((entry) => (
        <li key={entry.version} id={entry.version} className="scroll-mt-28">
          <Surface>
            <p className="text-xs text-accent">
              {entry.version} · <time dateTime={entry.date}>{entry.date}</time>
            </p>
            <h3 className="mt-2 font-display text-2xl">{entry.title}</h3>
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
  );
}

function ChangelogPage() {
  const current = changelog.filter((entry) => entry.era === "rust");
  const archive = changelog.filter((entry) => entry.era === "zig");
  return (
    <>
      <PageHero
        eyebrow="Changelog"
        title="Milestones, not a marketing calendar."
        lede="Versions are presentation-layer markers, not published package versions. Dates are the day the work landed. Each entry states only what the source trees implement."
      />
      <Section eyebrow="Current" title="The Rust tree">
        <Entries entries={current} />
      </Section>
      <Section
        eyebrow="Archive"
        title="Before the Rust rewrite"
        lede="These entries describe the superseded Zig implementation. They are kept for provenance and are not current build or source guidance."
      >
        <details className="group">
          <summary className="cursor-pointer text-sm text-accent">
            Show the {archive.length} Zig-era entries
          </summary>
          <div className="mt-6">
            <Entries entries={archive} />
          </div>
        </details>
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
