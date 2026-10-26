import { searchCatalog } from "@/lib/site-search-catalog";

/** `virtual:search-catalog-url` in the Vite build: the site search index, emitted as a static file. */
export const dynamic = "force-static";

export function GET() {
  return Response.json(searchCatalog);
}
