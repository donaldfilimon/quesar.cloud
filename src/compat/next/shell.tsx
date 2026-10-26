"use client";

import type { ReactNode } from "react";
import { NotFound } from "@/components/site/not-found";
import { SiteShell } from "@/components/site/shell";
import { AuthProvider } from "@/lib/auth/provider";
import { usePageViewTelemetry } from "@/lib/telemetry";
import { HeadTags } from "./route-view";

/** The client half of `src/routes/__root.tsx`: providers, telemetry and site chrome. */
export function RootShell({ children }: { children: ReactNode }) {
  usePageViewTelemetry();
  return (
    <AuthProvider>
      <SiteShell>{children}</SiteShell>
    </AuthProvider>
  );
}

/** The root `notFoundComponent`, with the head the 404 page needs. */
export function RootNotFound() {
  return (
    <>
      <HeadTags
        head={{
          meta: [{ title: "Page not found — Quesar" }, { name: "robots", content: "noindex" }],
        }}
      />
      <NotFound />
    </>
  );
}
