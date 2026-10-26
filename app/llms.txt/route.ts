import { buildLlmsTxt } from "@/lib/llms-txt";

/** GET /llms.txt: a Markdown index of the site for language models, emitted once at build time. */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
