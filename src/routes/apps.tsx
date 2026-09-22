import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, PageClose, PageHero, Section } from "@/components/site";
import { appSurfaces } from "@/lib/catalog";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/apps")({
  head: () =>
    pageHead(
      "Apps — Quesar surfaces",
      "In-browser orientations of MLAI apps: Abbey workspace, mobile vault, Quasar studio, Abbey bot, plugins, and more.",
    ),
  component: AppsPage,
});

function AppsPage() {
  return (
    <>
      <PageHero
        eyebrow="Apps"
        title="Every surface, in this site."
        lede="The shipping apps run on your machine. These pages are working orientations — documents, vaults, routers, and studios — so you do not have to leave for GitHub to see what they are."
      />
      <Section>
        <CopyGrid
          items={appSurfaces.map((app) => ({
            title: app.name,
            body: app.body,
            kicker: app.kicker,
            status: app.status,
            href: app.path,
          }))}
        />
      </Section>
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        next={[
          { to: "/workspace", label: "Workspace", body: "Documents on this machine." },
          { to: "/console", label: "Console", body: "Sign in and save what is current versus not claimed." },
          { to: "/developers", label: "Developers", body: "Live READMEs when GitHub answers." },
        ]}
      />
    </>
  );
}
