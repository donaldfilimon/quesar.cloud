import { createFileRoute } from "@tanstack/react-router";
import { QuasarSettings } from "@/components/quasar/settings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/quasar/settings")({
  // The origin lives in this browser's localStorage.
  ssr: false,
  head: () =>
    pageHead(
      "Settings — Quasar",
      "Set where this browser reaches your local Quasar service, and check that it answers.",
    ),
  component: QuasarSettings,
});
