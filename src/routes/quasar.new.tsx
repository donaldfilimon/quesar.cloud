import { createFileRoute } from "@tanstack/react-router";
import { QuasarNewSite } from "@/components/quasar/new-site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/quasar/new")({
  // The Quasar service is reached from the browser, never from this server.
  ssr: false,
  head: () =>
    pageHead(
      "New site — Quasar",
      "Create a Next.js site from a prompt with your local Quasar service.",
    ),
  component: QuasarNewSite,
});
