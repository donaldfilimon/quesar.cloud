import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CinematicFallback } from "@/cinematic/components/CinematicFallback";
import { pageHead } from "@/lib/seo";

const Room = lazy(() => import("@/cinematic/rooms/film"));

export const Route = createFileRoute("/showcase/film")({
  // Canvas, requestAnimationFrame and WebAudio only exist in the browser.
  ssr: false,
  head: () =>
    pageHead(
      "Film — Showcase",
      "The full scene-library film on the shared timeline engine. Atmosphere, not a measured result.",
    ),
  component: ShowcaseFilmPage,
});

function ShowcaseFilmPage() {
  return (
    <>
      {/* The room portals to <body>; this names the page for assistive tech. */}
      <h1 className="sr-only">Film — Showcase</h1>
      <Suspense fallback={<CinematicFallback />}>
        <Room />
      </Suspense>
    </>
  );
}
