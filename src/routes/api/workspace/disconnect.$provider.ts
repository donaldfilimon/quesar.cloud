import { createFileRoute } from "@tanstack/react-router";

/**
 * Drop a stored connection, revoking the grant at the provider first where
 * possible. POST, not GET: it mutates and must not be prefetchable.
 */
export const Route = createFileRoute("/api/workspace/disconnect/$provider")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const { gateWorkspaceRequest } = await import("@/lib/workspace-connectors/gate.server");
        const gate = await gateWorkspaceRequest();
        if (!gate.ok) return gate.response;
        const { disconnect } = await import("@/lib/workspace-connectors/handlers.server");
        return disconnect(params.provider, gate.userId);
      },
    },
  },
});
