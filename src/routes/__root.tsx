import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { SiteShell } from "@/components/site/shell";
import { NotFound } from "@/components/site/not-found";
import { site } from "@/lib/content";
import { usePageViewTelemetry } from "@/lib/telemetry";
import { canonicalUrl, SITE_ORIGIN } from "@/lib/seo";
import appCss from "../styles.css?url";

const THEME_BOOT = `(function(){try{var t=localStorage.getItem("mlai-theme");var theme=t==="light"||t==="dark"?t:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle("dark",theme==="dark");}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.classList.add("dark");}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "alternate", type: "application/rss+xml", title: "Quesar lab notes and research", href: "/feed.xml" },
    ],
  }),
  component: RootDocument,
  notFoundComponent: NotFound,
});

function PageViewTelemetry() {
  usePageViewTelemetry();
  return null;
}

/** Canonical and og:url follow the current route, so each page names itself. */
function CanonicalLinks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = canonicalUrl(pathname);
  return (
    <>
      <link rel="canonical" href={href} />
      <meta property="og:url" content={href} />
    </>
  );
}

function RootDocument() {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <CanonicalLinks />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="antialiased">
        <PageViewTelemetry />
        <AuthProvider>
          <SiteShell>
            <Outlet />
          </SiteShell>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
