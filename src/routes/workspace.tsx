import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceApp } from "@/components/apps/workspace-app";
import { HeroStatus, PageClose, PageHero, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";
import { staticSite } from "@/lib/static-site";

export const Route = createFileRoute("/workspace")({
  head: () =>
    pageHead(
      "Abbey workspace — Quesar",
      "In-browser Abbey document workspace. The shipping app uses SQLite, a Python worker, and an optional local model.",
    ),
  component: WorkspacePage,
});

function WorkspacePage() {
  return (
    <>
      <PageHero
        eyebrow="Workspace"
        title="Documents, on this machine."
        lede="The shipping Abbey workspace runs locally with SQLite, Better Auth, a Python worker, and an agent package. This page is the in-browser orientation of that loop."
      >
        <HeroStatus
          status="current"
          note={
            staticSite
              ? "Documents stay in this browser. The live model is unavailable on this static site."
              : "Notes stay in this browser. Live model requires sign-in."
          }
        />
      </PageHero>
      <Section>
        <WorkspaceApp />
      </Section>
      <PageClose
        primary={{ to: "/abbey", label: "Abbey" }}
        secondary={[{ to: "/console", label: "Console" }]}
        next={[{ to: "/developers", label: "Developers", body: "Setup lives with the source." }]}
      />
    </>
  );
}
