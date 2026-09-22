import { createFileRoute } from "@tanstack/react-router";

/**
 * OAuth redirect target: `<origin>/api/workspace/callback/{google,microsoft}`.
 * Verifies state, exchanges the code, seals and stores only the refresh token,
 * then returns to `/console/workspace`.
 */
export const Route = createFileRoute("/api/workspace/callback/$provider")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { gateWorkspaceRequest } = await import("@/lib/workspace-connectors/gate.server");
        const gate = await gateWorkspaceRequest();
        if (!gate.ok) return gate.response;
        const { finishCallback } = await import("@/lib/workspace-connectors/handlers.server");
        return finishCallback(request, params.provider, gate.userId);
      },
    },
  },
});
