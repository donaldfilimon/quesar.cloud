import { createFileRoute } from "@tanstack/react-router";

/** Recent Google Drive files for the signed-in user (`?days=`, clamped to 365). */
export const Route = createFileRoute("/api/workspace/drive")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { gateWorkspaceRequest } = await import("@/lib/workspace-connectors/gate.server");
        const gate = await gateWorkspaceRequest();
        if (!gate.ok) return gate.response;
        const { listSourceFiles } = await import("@/lib/workspace-connectors/handlers.server");
        const { fetchDriveFiles } = await import("@/lib/workspace-connectors/remote.server");
        return listSourceFiles(request, "google", gate.userId, (token, days, signal) =>
          fetchDriveFiles(token, days, fetch, signal),
        );
      },
    },
  },
});
