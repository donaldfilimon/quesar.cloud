import { createFileRoute } from "@tanstack/react-router";
import { VaultApp } from "@/components/apps/vault";
import { CopyGrid, HeroStatus, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/mobile")({
  head: () =>
    pageHead(
      "Mobile companion — Quesar",
      "Web vault orientation of the Expo mobile companion. Native CloudKit is a signed iOS build.",
    ),
  component: MobilePage,
});

function MobilePage() {
  return (
    <>
      <PageHero
        eyebrow="Mobile"
        title="A vault you can hold."
        lede="Expo SDK 53 companion. Native CloudKit and the encrypted-local fallback are distinct paths. Signed-device acceptance is not the same as this web export."
      >
        <HeroStatus status="partial" />
      </PageHero>
      <Section eyebrow="Web vault" title="Notes stay in this browser.">
        <div className="mx-auto max-w-md overflow-hidden rounded-[2rem] bg-bg-elevated p-3 shadow-[var(--shadow-border)]">
          <div className="rounded-[1.5rem] bg-bg p-2">
            <VaultApp />
          </div>
        </div>
        <div className="mt-10">
          <CopyGrid
            items={[
              {
                title: "Tabs",
                body: "Home, products, platform, company, vault — the Expo app mirrors this site's orientation.",
              },
              { title: "CloudKit", body: "Private vault on a signed Apple build. Not this page." },
              {
                title: "Fallback",
                body: "Encrypted-local store when iCloud is unavailable. Web uses localStorage only.",
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
