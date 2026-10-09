import { useState } from "react";
import { Play } from "lucide-react";
import { trailerEditions, type TrailerEdition } from "@/lib/trailer-editions";

function Edition({ film }: { film: TrailerEdition }) {
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      {started ? (
        <video
          controls
          playsInline
          preload="none"
          poster={film.poster}
          className="aspect-video w-full bg-black"
          aria-label={film.title}
          onError={() => setFailed(true)}
        >
          <source src={film.video} type="video/mp4" onError={() => setFailed(true)} />
          <track
            kind="captions"
            src={film.captions}
            srcLang="en"
            label="English captions"
            default
          />
        </video>
      ) : (
        <button
          type="button"
          className="group relative block aspect-video w-full bg-black text-white"
          aria-label={`Open player for ${film.title}`}
          onClick={() => setStarted(true)}
        >
          <img
            src={film.poster}
            width={1920}
            height={1080}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-black/70 group-hover:bg-black/90">
              <Play className="size-6" aria-hidden="true" />
            </span>
          </span>
        </button>
      )}
      <div className="p-5 sm:p-6">
        <p className="font-mono text-xs text-fg-subtle">
          {film.brand} · {film.style.toUpperCase()} · {film.seconds / 60} MIN · 1080P · NARRATED
        </p>
        <h3 className="mt-3 font-display text-2xl tracking-tight">{film.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">{film.description}</p>
        {failed && (
          <div className="mt-3">
            <p role="alert" className="text-sm">
              The video could not load. Open the MP4 or read the transcript below.
            </p>
            <button
              type="button"
              className="min-h-11 text-sm text-accent underline"
              onClick={() => {
                setFailed(false);
                setStarted(false);
              }}
            >
              Reset player
            </button>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm">
          <a href={film.video} className="text-accent underline underline-offset-4">
            Open MP4
          </a>
          <a href={film.captions} download className="text-accent underline underline-offset-4">
            Captions
          </a>
          <a href={film.transcript} className="text-accent underline underline-offset-4">
            Transcript
          </a>
        </div>
      </div>
    </li>
  );
}

export function TrailerEditions() {
  const [minutes, setMinutes] = useState<number | null>(null);
  const durations = [...new Set(trailerEditions.map((film) => film.seconds / 60))];
  const films = trailerEditions.filter((film) => minutes === null || film.seconds === minutes * 60);
  return (
    <div id="editions" className="scroll-mt-28">
      <p className="eyebrow">The film library</p>
      <h2 className="mt-4 font-display text-3xl tracking-tight sm:text-5xl">
        One ecosystem. Different perspectives.
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted">
        React-rendered films about MLAI and Quesar, with English captions and readable transcripts.
        These films describe vision and roadmap; current capabilities are documented on the product
        pages.
      </p>
      <div role="group" aria-label="Filter films by duration" className="my-8 flex flex-wrap gap-2">
        {[null, ...durations].map((duration) => (
          <button
            key={duration ?? "all"}
            type="button"
            aria-pressed={minutes === duration}
            onClick={() => setMinutes(duration)}
            className={`min-h-11 rounded-full border px-5 text-sm ${minutes === duration ? "border-accent bg-accent text-bg" : "border-border text-fg-muted hover:text-fg"}`}
          >
            {duration === null ? "All editions" : `${duration} min`}
          </button>
        ))}
      </div>
      <ul className="grid gap-6 lg:grid-cols-2">
        {films.map((film) => (
          <Edition key={film.id} film={film} />
        ))}
      </ul>
    </div>
  );
}
