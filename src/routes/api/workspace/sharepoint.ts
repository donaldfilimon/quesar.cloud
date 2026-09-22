import { createFileRoute } from "@tanstack/react-router";

/** Recent SharePoint / OneDrive files for the signed-in user (`?days=`, clamped to 365). */
export const Route = createFileRoute("/api/workspace/sharepoint")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { gateWorkspaceRequest } = await import("@/lib/workspace-connectors/gate.server");
        const gate = await gateWorkspaceRequest();
        if (!gate.ok) return gate.response;
        const { listSourceFiles } = await import("@/lib/workspace-connectors/handlers.server");
        const { fetchGraphFiles } = await import("@/lib/workspace-connectors/remote.server");
        return listSourceFiles(request, "microsoft", gate.userId, (token, days, signal) =>
          fetchGraphFiles(token, days, fetch, signal),
        );
      },
    },
  },
});
