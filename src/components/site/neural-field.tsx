import type { CSSProperties } from "react";
import "./neural-field.css";

type NeuralPoint = {
  x: number;
  y: number;
  z: number;
  radius: number;
};

type NeuralStyle = CSSProperties & {
  "--neural-delay": string;
  "--neural-opacity": number;
};

const center = { x: 280, y: 260 };
const sphereCount = 48;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));

// A fixed spherical distribution keeps server and client markup identical.
const sphere = Array.from({ length: sphereCount }, (_, index): NeuralPoint => {
  const vertical = 1 - (2 * (index + 0.5)) / sphereCount;
  const radial = Math.sqrt(1 - vertical * vertical);
  const angle = index * goldenAngle;
  const z = Math.sin(angle) * radial;
  const perspective = 1 + z * 0.18;
  return {
    x: center.x + Math.cos(angle) * radial * 184 * perspective,
    y: center.y + vertical * 190 * perspective,
    z,
    radius: 1.4 + ((z + 1) / 2) * 2.1,
  };
});

const inner = Array.from({ length: 8 }, (_, index): NeuralPoint => {
  const angle = (index / 8) * Math.PI * 2 + 0.24;
  return {
    x: center.x + Math.cos(angle) * (72 + (index % 3) * 9),
    y: center.y + Math.sin(angle) * (83 - (index % 2) * 14),
    z: 0.5,
    radius: index % 3 === 0 ? 3.4 : 2.4,
  };
});

const points: NeuralPoint[] = [...sphere, ...inner, { ...center, z: 1, radius: 4.5 }];
const coreIndex = points.length - 1;
const edgeKeys = new Set<string>();
const mesh: [number, number][] = [];

function addMeshEdge(first: number, second: number) {
  const start = Math.min(first, second);
  const end = Math.max(first, second);
  const key = `${start}-${end}`;
  if (edgeKeys.has(key)) return;
  edgeKeys.add(key);
  mesh.push([start, end]);
}

function distance(first: NeuralPoint, second: NeuralPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y, (first.z - second.z) * 184);
}

const neighbors = sphere.map((point, index) =>
  sphere
    .map((other, otherIndex) => ({ index: otherIndex, distance: distance(point, other) }))
    .filter((other) => other.index !== index)
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 3),
);

// Connect each point first, then fill the mesh to a bounded 72 connections.
for (let rank = 0; rank < 3; rank++) {
  neighbors.forEach((nearest, index) => {
    if (mesh.length < 72) addMeshEdge(index, nearest[rank].index);
  });
}

const branches: [number, number][] = inner.flatMap((_, index) => [
  [coreIndex, sphereCount + index],
  [sphereCount + index, sphereCount + ((index + 1) % inner.length)],
  [sphereCount + index, index * 6],
]);

function revealStyle(point: { x: number; y: number }, opacity: number): NeuralStyle {
  const radius = Math.hypot(point.x - center.x, point.y - center.y);
  return {
    "--neural-delay": `${(0.45 + radius / 94).toFixed(2)}s`,
    "--neural-opacity": opacity,
  };
}

/** Decorative, finite neural assembly; the final frame is an entirely static SVG. */
export function NeuralField({ className = "" }: { className?: string }) {
  return (
    <div className={`neural-field ${className}`} aria-hidden="true">
      <div className="neural-field-halo" />
      <svg className="neural-field-svg" viewBox="0 0 560 520" fill="none" focusable="false">
        <g className="neural-field-envelope">
          <ellipse cx="280" cy="260" rx="211" ry="211" />
          <ellipse cx="280" cy="260" rx="211" ry="78" transform="rotate(-25 280 260)" />
          <path d="M305 51C215 105 179 182 182 262C185 343 228 414 305 469" />
        </g>
        <g>
          {mesh.map(([first, second]) => {
            const start = points[first];
            const end = points[second];
            const depth = (start.z + end.z + 2) / 4;
            const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
            return (
              <path
                key={`${first}-${second}`}
                className={`neural-field-edge${depth < 0.35 ? " neural-field-edge-distant" : ""}`}
                d={`M${start.x.toFixed(2)} ${start.y.toFixed(2)}L${end.x.toFixed(2)} ${end.y.toFixed(2)}`}
                pathLength="1"
                style={revealStyle(midpoint, 0.12 + depth * 0.44)}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {branches.map(([first, second], index) => {
            const start = points[first];
            const end = points[second];
            return (
              <path
                key={`${first}-${second}`}
                className={`neural-field-edge neural-field-branch${index % 7 === 0 ? " neural-field-edge-violet" : ""}`}
                d={`M${start.x.toFixed(2)} ${start.y.toFixed(2)}L${end.x.toFixed(2)} ${end.y.toFixed(2)}`}
                pathLength="1"
                style={revealStyle(start, 0.6)}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>
        <g>
          {points.slice(0, coreIndex).map((point, index) => (
            <circle
              key={index}
              className={`neural-field-node${index >= sphereCount ? " neural-field-node-inner" : ""}`}
              cx={point.x.toFixed(2)}
              cy={point.y.toFixed(2)}
              r={point.radius.toFixed(2)}
              style={revealStyle(point, 0.28 + ((point.z + 1) / 2) * 0.68)}
            />
          ))}
        </g>
        <g className="neural-field-core">
          <circle className="neural-field-core-halo" cx="280" cy="260" r="18" />
          <circle className="neural-field-core-ring" cx="280" cy="260" r="10" />
          <circle cx="280" cy="260" r="4.5" />
          <circle className="neural-field-core-center" cx="279" cy="259" r="1.8" />
        </g>
      </svg>
    </div>
  );
}
