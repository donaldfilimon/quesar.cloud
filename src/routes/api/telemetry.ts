import { createFileRoute } from "@tanstack/react-router";

/** Anonymous page telemetry sink. See `src/lib/server/telemetry.server.ts`. */
export const Route = createFileRoute("/api/telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleTelemetry } = await import("@/lib/server/telemetry.server");
        const { appRoutePatterns } = await import("@/lib/server/telemetry-routes.server");
        return handleTelemetry(request, appRoutePatterns());
      },
    },
  },
});
