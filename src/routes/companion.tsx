import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, HeroStatus, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/companion")({
  head: () =>
    pageHead(
      "Abbey Companion — Quesar",
      "Native macOS SwiftUI companion for Abbey Bot. Local surface, not a hosted session.",
    ),
  component: CompanionPage,
});

function CompanionPage() {
  return (
    <>
      <PageHero
        eyebrow="Companion"
        title="A Mac window onto Abbey."
        lede="Native SwiftUI companion for Abbey Bot (Swift 6.4 / SwiftData). This page is the orientation — the binary runs on your Mac."
      >
        <HeroStatus status="partial" />
      </PageHero>
      <Section>
        <CopyGrid
          items={[
            { title: "SwiftData", body: "Local records on device. Not a cloud workspace disguised as a native shell." },
            { title: "SwiftUI", body: "Menus, threads, and claims. The companion does not invent a hosted API." },
            { title: "Boundary", body: "Not Quesar-as-a-service. Related to Abbey Bot, not a third product line." },
          ]}
          columns="md:grid-cols-3"
        />
        <div className="mt-8 overflow-hidden rounded-[24px] bg-bg-elevated p-6 shadow-[var(--shadow-border)]">
          <p className="font-mono text-[10px] tracking-[0.16em] text-accent uppercase">Window</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]">
            <div className="rounded-lg bg-bg p-3 font-mono text-[11px] text-fg-subtle">Threads · Claims · Memory</div>
            <div className="rounded-lg bg-bg p-4 text-sm text-fg-muted">
              Companion chrome. Sign-in on this website opens field notes, not this native session.
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
