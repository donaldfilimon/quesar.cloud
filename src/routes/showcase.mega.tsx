import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CinematicFallback } from "@/cinematic/components/CinematicFallback";
import { pageHead } from "@/lib/seo";

const Room = lazy(() => import("@/cinematic/rooms/mega"));

export const Route = createFileRoute("/showcase/mega")({
  // Canvas, requestAnimationFrame and WebAudio only exist in the browser.
  ssr: false,
  head: () =>
    pageHead(
      "Mega — Showcase",
      "The ~4.7-minute mega-trailer: kinetic beats and film scenes over a 3D neural field.",
    ),
  component: ShowcaseMegaPage,
});

function ShowcaseMegaPage() {
  return (
    <Suspense fallback={<CinematicFallback />}>
      <Room />
    </Suspense>
  );
}
