import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceApp } from "@/components/apps/workspace-app";
import { WorkspaceSources } from "@/components/workspace/workspace-sources";
import { PageClose, PageHero, Section } from "@/components/site";
import { RequireSession } from "@/lib/auth/gates";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/console/workspace")({
  head: () =>
    pageHead(
      "Console workspace — Quesar",
      "Signed-in document workspace. Documents stay in this browser; Google Drive and SharePoint connect read-only.",
    ),
  component: ConsoleWorkspacePage,
});

function ConsoleWorkspacePage() {
  return (
    <RequireSession>
      {(user) => (
        <>
          <PageHero
            eyebrow="Console workspace"
            title={`Documents for ${user.displayName ?? user.primaryEmail ?? "operator"}`}
            lede="Signed in. Documents in this panel stay in the browser. Architecture field notes live in the console and are scoped to your account."
            atmosphere="none"
          />
          <Section>
            <WorkspaceApp />
          </Section>
          <Section>
            <WorkspaceSources />
          </Section>
          <PageClose
            primary={{ to: "/console", label: "Console" }}
            next={[{ to: "/workspace", label: "Public workspace", body: "The same loop, without the console chrome." }]}
          />
        </>
      )}
    </RequireSession>
  );
}
