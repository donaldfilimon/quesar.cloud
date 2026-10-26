import { createFileRoute } from "@/framework/router";

/** CSP violation sink, stdout only. See `src/lib/server/csp-report.server.ts`. */
export const Route = createFileRoute("/api/csp-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCspReport } = await import("@/lib/server/csp-report.server");
        return handleCspReport(request);
      },
    },
  },
});
