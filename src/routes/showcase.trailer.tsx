import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CinematicFallback } from "@/cinematic/components/CinematicFallback";
import { pageHead } from "@/lib/seo";

const Room = lazy(() => import("@/cinematic/rooms/trailer"));

export const Route = createFileRoute("/showcase/trailer")({
  // Canvas, requestAnimationFrame and WebAudio only exist in the browser.
  ssr: false,
  head: () =>
    pageHead(
      "Trailer — Showcase",
      "The 62-second MLAI vision trailer, rendered live in the browser. Orientation, not a benchmark.",
    ),
  component: ShowcaseTrailerPage,
});

function ShowcaseTrailerPage() {
  return (
    <Suspense fallback={<CinematicFallback />}>
      <Room />
    </Suspense>
  );
}
