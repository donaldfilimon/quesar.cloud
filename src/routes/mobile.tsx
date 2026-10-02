import { createFileRoute } from "@tanstack/react-router";
import { VaultApp } from "@/components/apps/vault";
import { CopyGrid, HeroStatus, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/mobile")({
  head: () =>
    pageHead(
      "Mobile companion — Quesar",
      "Browser vault preview with localStorage notes and separate native shell source boundaries.",
    ),
  component: MobilePage,
});

function MobilePage() {
  return (
    <>
      <PageHero
        eyebrow="Mobile"
        title="A vault you can hold."
        lede="This browser preview stores notes in localStorage. The separate Capacitor shell and CloudKit availability plugin are source work; native build and signed-device sync acceptance remain unverified."
      >
        <HeroStatus status="partial" />
      </PageHero>
      <Section eyebrow="Web vault" title="Notes stay in this browser.">
        <div className="mx-auto max-w-md overflow-hidden rounded-[2rem] bg-bg-elevated p-3 shadow-border">
          <div className="rounded-[1.5rem] bg-bg p-2">
            <VaultApp />
          </div>
        </div>
        <div className="mt-10">
          <CopyGrid
            items={[
              {
                title: "Tabs",
                body: "This page previews the vault interaction. Separate native projects require their own platform setup and acceptance.",
              },
              {
                title: "CloudKit",
                body: "The separate plugin exposes availability and account-status checks. This page does not implement CloudKit sync.",
              },
              {
                title: "Fallback",
                body: "Browser notes use localStorage. This preview does not establish encrypted native storage or device delivery.",
              },
            ]}
            columns="md:grid-cols-3"
          />
        </div>
      </Section>
      <PageClose
        primary={{ to: "/apps", label: "All apps" }}
        next={[
          { to: "/workspace", label: "Workspace", body: "Documents on this machine." },
          { to: "/companion", label: "Companion", body: "The Mac window onto Abbey." },
        ]}
      />
    </>
  );
}
