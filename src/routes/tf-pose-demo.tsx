import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section } from "@/components/site";

// TensorFlow.js and PoseNet load inside this chunk only, and only in the browser.
const TFPoseDemo = lazy(() => import("@/components/demos/tf-pose-demo"));

export const Route = createFileRoute("/tf-pose-demo")({
  // getUserMedia, <canvas> and WebGL only exist in the browser.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pose detection demo — Quesar by MLAI" },
      {
        name: "description",
        content:
          "An isolated TensorFlow.js pose-detection prototype, separate from the MLAI platform.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PosePage,
});

function PosePage() {
  return (
    <>
      <PageHero
        eyebrow="Pose demo"
        title="Pose detection on your webcam, in this tab."
        lede="TensorFlow.js runs PoseNet locally and draws a skeleton over your camera feed. Nothing starts until you press Start, and no video leaves your browser. An isolated prototype, not a production vision stack."
        compact
      />
      <Section>
        <Suspense
          fallback={
            <div
              role="status"
              className="flex aspect-[4/3] items-center justify-center rounded-[18px] border border-border bg-bg-elevated text-xs text-fg-subtle lg:aspect-[8/3]"
            >
              Loading
            </div>
          }
        >
          <TFPoseDemo />
        </Suspense>
      </Section>
      <PageClose
        primary={{ to: "/demo", label: "WDBX demo" }}
        next={[{ to: "/apps", label: "Apps", body: "Other in-browser orientations." }]}
      />
    </>
  );
}
