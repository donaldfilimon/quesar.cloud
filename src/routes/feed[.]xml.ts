import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /feed.xml: RSS 2.0 for lab notes and research publications. Ported from
 * mlai `app/feed.xml/route.ts`. The `[.]` in the file name escapes the dot, so
 * the path is `/feed.xml` rather than a nested `/feed/xml`. Content is static
 * data, so the response is cacheable and changes only on deploy. The feed
 * builder is imported inside the handler: route files are part of the client
 * route tree, and a top-level import would ship every blog, docs and research
 * record in the main client bundle.
 */
export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { buildRssFeed } = await import("@/lib/mlai/feed");
        return new Response(buildRssFeed(), {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
