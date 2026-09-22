import { createFileRoute } from "@tanstack/react-router";
import { QuasarSiteDetail } from "@/components/quasar/site-detail";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/quasar/site/$id")({
  // The Quasar service is reached from the browser, never from this server.
  ssr: false,
  head: () =>
    pageHead(
      "Site — Quasar",
      "Follow a Quasar generation, send edits and preview the site on your machine.",
    ),
  component: QuasarSitePage,
});

function QuasarSitePage() {
  const { id } = Route.useParams();
  // Keyed so switching sites never carries one site's feed cursor into another.
  return <QuasarSiteDetail key={id} id={id} />;
}
