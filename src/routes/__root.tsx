import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteShell } from "@/components/site/shell";
import { site } from "@/lib/content";
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

function RootDocument() {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
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

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-accent uppercase">404</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Page not found</h1>
      <p className="mt-4 text-fg-muted">
        That path is not part of the public Quesar site. Try the architecture, or start from home.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <a
          href="/"
          className="inline-flex h-11 items-center rounded-md bg-fg px-4 text-sm font-medium text-bg no-underline"
        >
          Home
        </a>
        <a
          href="/architecture"
          className="inline-flex h-11 items-center rounded-md bg-bg-elevated px-4 text-sm font-medium text-fg no-underline shadow-[var(--shadow-border)]"
        >
          Architecture
        </a>
      </div>
    </div>
  );
}
