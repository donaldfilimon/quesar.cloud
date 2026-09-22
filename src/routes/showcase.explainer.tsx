import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CinematicFallback } from "@/cinematic/components/CinematicFallback";
import { pageHead } from "@/lib/seo";

const Room = lazy(() => import("@/cinematic/rooms/explainer"));

export const Route = createFileRoute("/showcase/explainer")({
  // Canvas, requestAnimationFrame and WebAudio only exist in the browser.
  ssr: false,
  head: () => pageHead("Explainer — Showcase", "What is MLAI? A narrated ~2-minute explainer. Vision is labeled, not asserted."),
  component: ShowcaseExplainerPage,
});

function ShowcaseExplainerPage() {
  return (
    <Suspense fallback={<CinematicFallback />}>
      <Room />
    </Suspense>
  );
}
