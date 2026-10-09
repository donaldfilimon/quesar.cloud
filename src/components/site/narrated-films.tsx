import { useState } from "react";
import { Play } from "lucide-react";
import { filmCollection, type FilmRecord } from "@/lib/mlai/categories/film-collection";

function NarratedFilm({ film }: { film: FilmRecord }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const base = `/media/films/${film.export.basename}`;
  const duration = `${Math.floor(film.duration / 60)}:${String(film.duration % 60).padStart(2, "0")}`;

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      {loaded ? (
        <video
          className="aspect-video w-full bg-black"
          controls
          autoPlay
          playsInline
          preload="none"
          poster={`${base}.poster.png`}
          aria-label={film.title}
          onError={() => setFailed(true)}
        >
          <source src={`${base}.mp4`} type="video/mp4" onError={() => setFailed(true)} />
          <track
            kind="captions"
            src={`${base}.vtt`}
            srcLang="en"
            label="English captions"
            default
          />
        </video>
      ) : (
        <button
          type="button"
          className="group relative block aspect-video w-full bg-black text-white"
          aria-label={`Play ${film.title}`}
          onClick={() => {
            setFailed(false);
            setLoaded(true);
          }}
        >
          <img
            src={`${base}.poster.png`}
            alt=""
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-black/70 group-hover:bg-black/85">
              <Play className="size-6 translate-x-0.5" aria-hidden="true" />
            </span>
          </span>
        </button>
      )}
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-xl text-fg">{film.title}</h3>
          <span className="font-mono text-xs text-fg-muted">{duration} · AI narration</span>
        </div>
        {failed ? (
          <div>
            <p role="alert" className="text-sm text-fg">
              Playback could not load. Download the film or read its transcript.
            </p>
            <button
              type="button"
              className="min-h-11 text-sm text-accent underline underline-offset-4"
              onClick={() => {
                setFailed(false);
                setLoaded(false);
              }}
            >
              Reset player
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a className="text-accent underline underline-offset-4" href={`${base}.mp4`} download>
            Download MP4
          </a>
          <a className="text-accent underline underline-offset-4" href={`${base}.vtt`} download>
            Captions
          </a>
          <a className="text-accent underline underline-offset-4" href={`${base}.transcript.txt`}>
            Transcript
          </a>
        </div>
      </div>
    </li>
  );
}

/** Loaded only by the showcase route; large media is requested on Play. */
export function NarratedFilms() {
  return (
    <section aria-labelledby="narrated-films-title" className="space-y-6">
      <div className="max-w-3xl space-y-3">
        <h2 id="narrated-films-title" className="font-display text-3xl text-fg">
          The narrated collection
        </h2>
        <p className="text-base leading-relaxed text-fg-muted">
          Six films to watch here or take with you. English captions and transcripts accompany every
          film. The films carry source, vision and roadmap labels; they do not establish benchmarks
          or shipped capability.
        </p>
      </div>
      <ul className="grid gap-6 md:grid-cols-2">
        {filmCollection.map((film) => (
          <NarratedFilm key={film.id} film={film} />
        ))}
      </ul>
    </section>
  );
}
