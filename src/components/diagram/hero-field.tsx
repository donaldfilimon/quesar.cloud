import { useEffect, useRef } from "react";

type GraphNode = { x: number; y: number; r: number; vx: number; vy: number };
type GraphEdge = { a: number; b: number; t: number; speed: number };

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hexAlpha(hex: string, alpha: number) {
  const n = hex.replace("#", "").trim();
  if (n.length < 6) return `rgba(110, 202, 216, ${alpha})`;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const surface = canvas;
    const g = ctx;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = seeded(42);
    const nodes: GraphNode[] = Array.from({ length: 26 }, () => ({
      x: rand(),
      y: rand(),
      r: 1.1 + rand() * 1.6,
      vx: (rand() - 0.5) * 0.00018,
      vy: (rand() - 0.5) * 0.00018,
    }));
    const edges: GraphEdge[] = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (dx * dx + dy * dy < 0.085) {
          edges.push({ a: i, b: j, t: rand(), speed: 0.0012 + rand() * 0.0018 });
        }
      }
    }

    const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6ecad8";
    const accent = raw.startsWith("#") ? raw : "#6ecad8";
    const line = hexAlpha(accent, 0.28);
    const particle = hexAlpha(accent, 0.92);
    let frame = 0;
    let running = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(surface);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = surface.getBoundingClientRect();
      surface.width = Math.max(1, Math.floor(width * dpr));
      surface.height = Math.max(1, Math.floor(height * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function paint(animate: boolean) {
      const { width, height } = surface.getBoundingClientRect();
      g.clearRect(0, 0, width, height);
      g.lineWidth = 1;

      if (animate) {
        for (const node of nodes) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0.04 || node.x > 0.96) node.vx *= -1;
          if (node.y < 0.06 || node.y > 0.94) node.vy *= -1;
        }
      }

      for (const link of edges) {
        const a = nodes[link.a];
        const b = nodes[link.b];
        const x1 = a.x * width;
        const y1 = a.y * height;
        const x2 = b.x * width;
        const y2 = b.y * height;
        g.strokeStyle = line;
        g.globalAlpha = 0.7;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();

        if (animate) {
          link.t = (link.t + link.speed) % 1;
          const px = x1 + (x2 - x1) * link.t;
          const py = y1 + (y2 - y1) * link.t;
          g.globalAlpha = 0.95;
          g.fillStyle = particle;
          g.beginPath();
          g.arc(px, py, 1.15, 0, Math.PI * 2);
          g.fill();
        }
      }

      g.globalAlpha = 1;
      for (const node of nodes) {
        g.fillStyle = accent;
        g.beginPath();
        g.arc(node.x * width, node.y * height, node.r, 0, Math.PI * 2);
        g.fill();
      }
    }

    function loop() {
      if (running) paint(true);
      frame = window.requestAnimationFrame(loop);
    }

    resize();
    paint(false);
    window.addEventListener("resize", resize);
    if (!reduce) frame = window.requestAnimationFrame(loop);

    return () => {
      running = false;
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={ref} className="hero-field" aria-hidden="true" />;
}
