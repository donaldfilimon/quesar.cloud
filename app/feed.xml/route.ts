import { buildRssFeed } from "@/lib/mlai/feed";

/** GET /feed.xml, ported from `src/routes/feed[.]xml.ts`: static data, emitted once at build time. */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildRssFeed(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
