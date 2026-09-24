import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CinematicFallback } from "@/cinematic/components/CinematicFallback";
import { pageHead } from "@/lib/seo";

const Room = lazy(() => import("@/cinematic/rooms/abbey"));

export const Route = createFileRoute("/showcase/abbey")({
  // Canvas, requestAnimationFrame and WebAudio only exist in the browser.
  ssr: false,
  head: () =>
    pageHead(
      "Abbey — Showcase",
      "The Abbey companion trailer. Persona language, not a capability claim.",
    ),
  component: ShowcaseAbbeyPage,
});

function ShowcaseAbbeyPage() {
  return (
    <>
      {/* The room portals to <body>; this names the page for assistive tech. */}
      <h1 className="sr-only">Abbey — Showcase</h1>
      <Suspense fallback={<CinematicFallback />}>
        <Room />
      </Suspense>
    </>
  );
}
