import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@/lib/auth/server";
import { withOAuthProvenance } from "@/lib/auth/oauth-provenance.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => withOAuthProvenance(() => getAuth().handler(request)),
      POST: ({ request }) => withOAuthProvenance(() => getAuth().handler(request)),
    },
  },
});
