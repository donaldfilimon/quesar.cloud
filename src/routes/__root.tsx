import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteShell } from "@/components/site/shell";
import { NotFound } from "@/components/site/not-found";
import { site } from "@/lib/content";
import { usePageViewTelemetry } from "@/lib/telemetry";
import appCss from "../styles.css?url";

const THEME_BOOT = `(function(){try{var t=localStorage.getItem("mlai-theme");var theme=t==="light"||t==="dark"?t:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle("dark",theme==="dark");}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.classList.add("dark");}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${site.name} — ${site.company}` },
      { name: "description", content: site.description },
      { name: "theme-color", content: "oklch(0.153 0.006 107.1)" },
      { name: "color-scheme", content: "dark light" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "canonical", href: "https://quesar.cloud/" },
      { rel: "alternate", type: "application/rss+xml", title: "Quesar lab notes and research", href: "/feed.xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: RootDocument,
  notFoundComponent: NotFound,
});

function PageViewTelemetry() {
  usePageViewTelemetry();
  return null;
}

function RootDocument() {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
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
