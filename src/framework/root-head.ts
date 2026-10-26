import { site } from "@/lib/site-identity";
import { SITE_ORIGIN } from "@/lib/seo";
import type { HeadDescriptor } from "./router";

/**
 * Site-wide head defaults from `src/routes/__root.tsx`, merged under every route's
 * own `head()` so a page's title and description replace them rather than repeat
 * them. Next adds `charset` and `viewport` itself; the static links (icon,
 * manifest, feed) are in `app/layout.tsx`.
 */
export const rootHead: HeadDescriptor = {
  meta: [
    { title: `${site.name} — ${site.company}` },
    { name: "description", content: site.description },
    { name: "theme-color", content: "#f6f7f2", media: "(prefers-color-scheme: light)" },
    { name: "theme-color", content: "#111410", media: "(prefers-color-scheme: dark)" },
    { name: "color-scheme", content: "dark light" },
    { property: "og:site_name", content: site.name },
    { property: "og:type", content: "website" },
    { property: "og:title", content: `${site.name} — ${site.company}` },
    { property: "og:description", content: site.description },
    { property: "og:image", content: `${SITE_ORIGIN}/og.jpg` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: `${SITE_ORIGIN}/og.jpg` },
  ],
};
