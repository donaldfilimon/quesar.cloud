import type { ReactNode } from "react";
import { RootShell } from "@/compat/next/shell";
import "@/styles.css";

/**
 * Root document, ported from `src/routes/__root.tsx`. Page titles, descriptions and
 * the canonical link come from each route's `head()` (src/compat/next/route-view.tsx).
 */
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("mlai-theme");var theme=t==="light"||t==="dark"?t:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle("dark",theme==="dark");}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Quesar lab notes, research and releases"
          href="/feed.xml"
        />
      </head>
      <body className="antialiased">
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
