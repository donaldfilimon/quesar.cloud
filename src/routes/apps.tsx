import { clientExperience } from "@/lib/mlai/categories/client-experience";
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
        eyebrow={clientExperience.landingIntros.apps.eyebrow}
        title={clientExperience.landingIntros.apps.title}
        lede={clientExperience.landingIntros.apps.lede}
      />
      <Section>
        <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
          {clientExperience.landingIntros.apps.availability}
        </p>
        <a
          href={clientExperience.landingIntros.apps.sources[0]}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm text-accent underline underline-offset-4"
        >
          Inspect the source behind this page
        </a>
      </Section>
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
        primary={{ to: "/contact", label: "Discuss your project" }}
        secondary={[
          { to: "/architecture", label: "Architecture" },
          { to: "/docs", label: "Documentation" },
        ]}
        next={[
          { to: "/workspace", label: "Workspace", body: "Documents on this machine." },
          {
            to: "/console",
            label: "Console",
            body: "Sign in and save what is current versus not claimed.",
          },
          { to: "/developers", label: "Developers", body: "Live READMEs when GitHub answers." },
        ]}
      />
    </>
  );
}
