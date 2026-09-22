import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const COLS = 48;
const ROWS = 28;

function empty() {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
}

function seed() {
  const grid = empty();
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      grid[y][x] = Math.random() < 0.28 ? 1 : 0;
    }
  }
  return grid;
}

function step(grid: number[][]) {
  const next = empty();
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const yy = (y + dy + ROWS) % ROWS;
          const xx = (x + dx + COLS) % COLS;
          n += grid[yy][xx];
        }
      }
      next[y][x] = grid[y][x] ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
    }
  }
  return next;
}

export function CellMachine() {
  const [grid, setGrid] = useState<number[][]>(() => seed());
  const [running, setRunning] = useState(true);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setGrid((g) => step(g)), 120);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cw = w / COLS;
    const ch = h / ROWS;
    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!grid[y][x]) continue;
        ctx.fillStyle = "rgba(110,202,216,0.85)";
        ctx.fillRect(x * cw + 0.5, y * ch + 0.5, cw - 1, ch - 1);
      }
    }
  }, [grid]);

  return (
    <div className="surface overflow-hidden p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setRunning((v) => !v)}>
          {running ? "Pause" : "Run"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setGrid(seed())}>
          Reseed
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setGrid(empty())}>
          Clear
        </Button>
      </div>
      <canvas
        ref={ref}
        width={768}
        height={448}
        className="h-auto w-full rounded-md bg-bg"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = Math.floor(((event.clientX - rect.left) / rect.width) * COLS);
          const y = Math.floor(((event.clientY - rect.top) / rect.height) * ROWS);
          setGrid((g) => g.map((row, yy) => row.map((cell, xx) => (xx === x && yy === y ? (cell ? 0 : 1) : cell))));
        }}
      />
      <p className="mt-3 text-xs text-fg-subtle">Founder research. Not a Quesar product. Click a cell to toggle.</p>
    </div>
  );
}
