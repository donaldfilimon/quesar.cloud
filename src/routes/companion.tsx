import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, HeroStatus, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/companion")({
  head: () =>
    pageHead(
      "Abbey Companion — Quesar",
      "Browser orientation to companion concepts. Native implementation and device acceptance require separate source evidence.",
    ),
  component: CompanionPage,
});

function CompanionPage() {
  return (
    <>
      <PageHero
        eyebrow="Companion"
        title="Explore a companion interface."
        lede="Browser orientation to companion concepts. Native implementation and device acceptance require separate source evidence."
      >
        <HeroStatus status="partial" />
      </PageHero>
      <Section>
        <CopyGrid
          items={[
            {
              title: "Illustrated local records",
              body: "Explore the record organization shown in this browser illustration.",
            },
            {
              title: "Illustrated companion interface",
              body: "Inspect the companion concepts presented here: threads, claims, and memory.",
            },
            {
              title: "Product boundary",
              body: "This page presents companion concepts; a native runtime has its own implementation and qualification requirements.",
            },
          ]}
          columns="md:grid-cols-3"
        />
        <div className="mt-8 overflow-hidden rounded-[24px] bg-bg-elevated p-6 shadow-border">
          <p className="text-xs text-accent">Window</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]">
            <div className="rounded-lg bg-bg p-3 font-mono text-2xs text-fg-subtle">
              Threads · Claims · Memory
            </div>
            <div className="rounded-lg bg-bg p-4 text-sm text-fg-muted">
              Browser illustration of companion chrome: threads, claims, and memory.
            </div>
          </div>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/abbey-bot", label: "Abbey bot" }}
        next={[
          { to: "/mobile", label: "Mobile", body: "The handheld vault orientation." },
          { to: "/apps", label: "Apps", body: "Every surface, in this site." },
        ]}
      />
    </>
  );
}
