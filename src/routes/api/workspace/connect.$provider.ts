import { createFileRoute } from "@tanstack/react-router";

/**
 * Start the Drive / SharePoint OAuth flow (a top-level navigation from the
 * Connect link). Redirects to the provider's consent screen, or back to
 * `/console/workspace?error=…` when the provider or the encryption key is not
 * configured.
 */
export const Route = createFileRoute("/api/workspace/connect/$provider")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { gateWorkspaceRequest } = await import("@/lib/workspace-connectors/gate.server");
        const gate = await gateWorkspaceRequest();
        if (!gate.ok) return gate.response;
        const { startConnect } = await import("@/lib/workspace-connectors/handlers.server");
        return startConnect(request, params.provider);
      },
    },
  },
});
