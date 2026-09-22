import { createFileRoute } from "@tanstack/react-router";

/** Which workspace providers this user has connected, and which are available. */
export const Route = createFileRoute("/api/workspace/connections")({
  server: {
    handlers: {
      GET: async () => {
        const { gateWorkspaceRequest } = await import("@/lib/workspace-connectors/gate.server");
        const gate = await gateWorkspaceRequest();
        if (!gate.ok) return gate.response;
        const { listConnections } = await import("@/lib/workspace-connectors/handlers.server");
        return listConnections(gate.userId);
      },
    },
  },
});
