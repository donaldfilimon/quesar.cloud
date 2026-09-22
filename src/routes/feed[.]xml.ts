import { createFileRoute } from "@tanstack/react-router";
import { buildRssFeed } from "@/lib/mlai/feed";

/**
 * GET /feed.xml: RSS 2.0 for lab notes and research publications. Ported from
 * mlai `app/feed.xml/route.ts`. The `[.]` in the file name escapes the dot, so
 * the path is `/feed.xml` rather than a nested `/feed/xml`. Content is static
 * data, so the response is cacheable and changes only on deploy.
 */
export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildRssFeed(), {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        }),
    },
  },
});
