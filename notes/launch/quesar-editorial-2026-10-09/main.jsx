import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import chapters from "./chapters.json";
import "./style.css";

const root = createRoot(document.getElementById("root"));
const selections = {
  60: [0, 10, 14, 29],
  120: [0, 2, 6, 8, 10, 14, 18, 29],
  180: [0, 1, 2, 6, 8, 10, 12, 14, 16, 18, 23, 29],
  600: chapters.map((_, i) => i),
};
window.filmChapters = chapters;
window.selections = selections;
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - (1 - clamp(x)) ** 3;
const family = (id) =>
  id === 0
    ? "hero"
    : id === 29
      ? "closing"
      : id === 10 || chapters[id][4] === "BOUNDARY"
        ? "boundary"
        : id >= 11 && id <= 19
          ? "workflow"
          : "evidence";
function Reveal({ local, delay = 0, children, className = "" }) {
  const a = ease((local - delay) / 0.85);
  return (
    <div
      className={className}
      style={{ opacity: a, transform: `translate3d(0,${(1 - a) * 36}px,0)` }}
    >
      {children}
    </div>
  );
}
function Diagram({ kind, c, local, studio, id }) {
  const boundaries = {
    7: [
      ["STORAGE", "Integrity", "Durable records · causal history", "Inspectable provenance"],
      [
        "KNOWLEDGE",
        "Truth",
        "Claims require independent evidence",
        "Multi-host deployment unproven",
      ],
    ],
    9: [
      ["LOCAL FRAMEWORKS", "Source", "CLI · MCP contracts", "Read setup and verification"],
      [
        "HOSTED INTERFACE",
        "Unpublished",
        "Quesar APIs · platform SDKs",
        "No hosted availability claim",
      ],
    ],
    26: [
      ["STATIC WEBSITE", "Read", "Orientation · explicit notices", "No server calls"],
      [
        "SERVER DEPLOYMENT",
        "Configure",
        "Server-backed capabilities",
        "Requires configured deployment",
      ],
    ],
    27: [
      ["WITH A PROVIDER", "Configured", "One model interface", "Availability is explicit"],
      ["WITHOUT A PROVIDER", "Unavailable", "Model not configured", "No invented model response"],
    ],
  };
  const scopes = boundaries[id] ?? [
    ["WEBSITE & DIRECTION", "Quesar", "Products · research · orientation", "quesar.cloud"],
    [
      "CONFIGURED SERVICE",
      "Quasar",
      "Local builder · explicit connection",
      "Your machine · your origin",
    ],
  ];
  if (kind === "hero")
    return (
      <div className="atlas" aria-label="Illustrative human and system relationship">
        <div className="atlas-ring" style={{ transform: `rotate(${local * 2}deg)` }} />
        <div className="atlas-ring inner" style={{ transform: `rotate(${-local * 3}deg)` }} />
        <span className="atlas-centre">
          Human
          <br />
          <em>agency.</em>
        </span>
        {["INTENT", "CONTEXT", "EVIDENCE"].map((n, i) => (
          <Reveal
            key={n}
            local={local}
            delay={0.65 + i * 0.45}
            className={`atlas-label label-${i}`}
          >
            {n}
          </Reveal>
        ))}
      </div>
    );
  if (kind === "boundary")
    return (
      <div className="scopes">
        {scopes.map((scope, i) => (
          <React.Fragment key={scope[1]}>
            {i === 1 && (
              <div
                className="scope-divider"
                style={{ transform: `scaleY(${ease((local - 1) / 1.5)})` }}
              />
            )}
            <Reveal local={local} delay={0.4 + i * 0.8}>
              <div className={`scope ${i ? "secondary" : ""}`}>
                <small>
                  0{i + 1} / {scope[0]}
                </small>
                <strong>{scope[1]}</strong>
                <p>{scope[2]}</p>
                <span>{scope[3]}</span>
              </div>
            </Reveal>
          </React.Fragment>
        ))}
      </div>
    );
  if (kind === "workflow")
    return (
      <div className="workflow">
        {["PROMPT", "TEMPLATE", "GENERATION", "PREVIEW"].map((n, i) => (
          <Reveal key={n} local={local} delay={0.45 + i * 0.55}>
            <div className="step">
              <b>0{i + 1}</b>
              <strong>{n}</strong>
              <span>
                {
                  [
                    "Your request",
                    "Local Next.js site",
                    "Configured Claude job",
                    "Inspect on your machine",
                  ][i]
                }
              </span>
            </div>
          </Reveal>
        ))}
        <p className="diagram-note">
          ILLUSTRATIVE WORKFLOW
          <br />
          Browser → separately configured local service
        </p>
      </div>
    );
  if (kind === "closing")
    return (
      <div className="closing-mark">
        <div className="closing-line" style={{ transform: `scaleX(${ease(local / 2)})` }} />
        <Reveal local={local} delay={0.8}>
          <span>EXPLORE / INSPECT / BUILD</span>
          <strong>Q.</strong>
          <p>
            Human imagination.
            <br />
            Evidence at every step.
          </p>
        </Reveal>
      </div>
    );
  return (
    <div className="evidence-sheet">
      <Reveal local={local} delay={0.35}>
        <small>SOURCE NOTE / {c[4]}</small>
        <strong>{c[0]}</strong>
        <div className="evidence-rule" />
        <p>{c[2]}</p>
      </Reveal>
      <Reveal local={local} delay={1.3}>
        <div className="evidence-path">{c[3]}</div>
        <span className="evidence-foot">
          {studio ? "WORKSHOP READING" : "ARCHITECTURE READING"} · {c[5]}
        </span>
      </Reveal>
    </div>
  );
}
export function Film({ time, duration, edition }) {
  const ids = selections[duration];
  const timeline =
    window.filmTimeline?.duration === duration
      ? window.filmTimeline.chapters
      : ids.map((id, i) => ({
          id,
          start: (i * duration) / ids.length,
          end: ((i + 1) * duration) / ids.length,
        }));
  const index = Math.max(
    0,
    timeline.findLastIndex((c) => time >= c.start),
  );
  const shot = timeline[index],
    c = chapters[shot.id],
    local = time - shot.start,
    remaining = shot.end - time,
    kind = family(shot.id),
    studio = edition === "studio";
  const entrance = ease(local / 0.65),
    exit = clamp(remaining / 0.55),
    drift = clamp(local / (shot.end - shot.start));
  return (
    <main className={`${studio ? "studio" : ""} shot-${kind}`}>
      <div className="grain" />
      <header>
        <b>
          Quesar<span> by MLAI</span>
        </b>
        <span>
          {studio ? "THE LOCAL WORKSHOP" : "AN INSPECTABLE FUTURE"} /{" "}
          {String(index + 1).padStart(2, "0")}
        </span>
      </header>
      <div
        className="shot"
        style={{
          opacity: entrance * exit,
          transform: `translate3d(${(drift - 0.5) * (studio ? -12 : 12)}px,${(1 - entrance) * 18}px,0) scale(${1 + drift * 0.012})`,
        }}
      >
        <section className="layout">
          <article>
            <Reveal local={local} delay={0.05}>
              <div className="label">
                {c[4] === "SOURCE" ? "SOURCED" : c[4]} <i /> {c[5]}
              </div>
            </Reveal>
            <Reveal local={local} delay={0.18}>
              <h1>
                {c[0]}
                <em>{c[1]}</em>
              </h1>
            </Reveal>
            <Reveal local={local} delay={0.65}>
              <p className="body-copy">{c[2]}</p>
            </Reveal>
            <Reveal local={local} delay={1}>
              <div className="reference">SOURCE / {c[3]}</div>
            </Reveal>
          </article>
          <aside>
            <Diagram kind={kind} c={c} local={local} studio={studio} id={shot.id} />
            <div className="illustrative">
              ILLUSTRATIVE · SOURCE-GUIDED DIAGRAM
              <br />
              Not a live service trace.
            </div>
          </aside>
        </section>
      </div>
      <footer>
        <span>quesar.cloud</span>
        <span>{studio ? "DESIGN" : "ARCHITECTURE"} EDITION / ABBEY NEURAL NARRATION</span>
        <span>
          {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, "0")} / {duration / 60}
          :00
        </span>
      </footer>
      <div className="progress" style={{ width: `${(time / duration) * 100}%` }} />
    </main>
  );
}
window.renderFrame = (time, duration = 60, edition = "architecture") =>
  flushSync(() => root.render(<Film time={time} duration={duration} edition={edition} />));
window.renderFrame(0);
window.ready = true;
