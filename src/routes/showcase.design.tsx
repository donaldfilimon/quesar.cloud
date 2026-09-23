import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CinematicFallback } from "@/cinematic/components/CinematicFallback";
import { pageHead } from "@/lib/seo";

const Room = lazy(() => import("@/cinematic/rooms/design"));

export const Route = createFileRoute("/showcase/design")({
  // Canvas, requestAnimationFrame and WebAudio only exist in the browser.
  ssr: false,
  head: () =>
    pageHead(
      "Design lab — Showcase",
      "The MLAI design lab: brand, system, showcase, hero, lab, marketing, console and docs boards.",
    ),
  component: ShowcaseDesignPage,
});

function ShowcaseDesignPage() {
  return (
    <Suspense fallback={<CinematicFallback />}>
      <Room />
    </Suspense>
  );
}
