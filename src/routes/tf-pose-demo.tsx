import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section } from "@/components/site";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tf-pose-demo")({
  head: () => ({
    meta: [
      { title: "Pose demo — Quesar" },
      { name: "description", content: "Browser pose orientation. Illustrative skeleton, not a production vision stack." },
    ],
  }),
  component: PosePage,
});

function PosePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;
    const joints = [
      [0.5, 0.18],
      [0.5, 0.32],
      [0.38, 0.34],
      [0.62, 0.34],
      [0.32, 0.5],
      [0.68, 0.5],
      [0.42, 0.58],
      [0.58, 0.58],
      [0.4, 0.82],
      [0.6, 0.82],
    ];
    const edges = [
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [1, 6],
      [1, 7],
      [6, 8],
      [7, 9],
    ];
    function draw() {
      if (!ctx || !canvas) return;
      frame += 1;
      ctx.fillStyle = "#07090d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const t = frame / 40;
      ctx.strokeStyle = "rgba(110,202,216,0.85)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      const width = canvas.width;
      const height = canvas.height;
      function pt(i: number): [number, number] {
        const [x, y] = joints[i];
        const wobble = Math.sin(t + i) * 0.015;
        return [(x + wobble) * width, (y + Math.cos(t + i * 0.4) * 0.01) * height];
      }
      ctx.beginPath();
      for (const [a, b] of edges) {
        const [x1, y1] = pt(a);
        const [x2, y2] = pt(b);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.fillStyle = "#5ec49a";
      for (let i = 0; i < joints.length; i += 1) {
        const [x, y] = pt(i);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = window.requestAnimationFrame(draw);
    }
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [running]);

  return (
    <>
      <PageHero
        eyebrow="Pose demo"
        title="A skeleton, not a product."
        lede="Illustrative browser animation of the historical tf-pose demo. This is not a production vision stack and does not access your camera unless you opt in later."
      />
      <Section>
        <canvas ref={canvasRef} width={720} height={420} className="h-auto w-full rounded-[18px] bg-bg-elevated shadow-[var(--shadow-border)]" />
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={() => setRunning((v) => !v)}>
            {running ? "Pause" : "Run"}
          </Button>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/demo", label: "Persona demo" }}
        next={[{ to: "/apps", label: "Apps", body: "Other in-browser orientations." }]}
      />
    </>
  );
}
