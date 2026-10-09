import { useState } from "react";
import { Play, ArrowDownToLine } from "lucide-react";
import { trailerEditions, type TrailerEdition } from "@/lib/trailer-editions";
import "./trailer-editions.css";

const defaultFilm =
  trailerEditions.find((film) => film.id === "quesar-architecture-60") ?? trailerEditions[0];
const durations = [60, 120, 180, 600] as const;
const editionLabel = (film: TrailerEdition) =>
  film.edition === "native30" ? "Native30 · Samantha narration" : "Neural performance";

function FilmPlayer({ film }: { film: TrailerEdition }) {
  const [opened, setOpened] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="edition-screen">
      {opened && !failed ? (
        <video
          controls
          playsInline
          preload="none"
          poster={film.poster}
          aria-label={film.title}
          onError={() => setFailed(true)}
        >
          <source src={film.video} type="video/mp4" />
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
          className="edition-play"
          aria-label={`${failed ? "Retry" : "Open"} player for ${film.title}`}
          onClick={() => {
            setFailed(false);
            setOpened(true);
          }}
        >
          <img src={film.poster} width={1920} height={1080} alt="" decoding="async" />
          <span className="edition-play-label">
            <Play size={22} aria-hidden="true" /> {failed ? "Retry film" : "Open player"}
          </span>
        </button>
      )}
      {failed && (
        <p className="edition-error" role="alert">
          The film could not load. Retry playback or use the transcript and download links.
        </p>
      )}
      {opened && (
        <div className="edition-resources">
          <a href={film.captions} download>
            Download captions
          </a>
          <a href={film.transcript} target="_blank" rel="noreferrer">
            Read transcript
          </a>
          <a href={film.video} download>
            <ArrowDownToLine size={16} aria-hidden="true" /> Download MP4
          </a>
        </div>
      )}
    </div>
  );
}

export function TrailerEditions() {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState(defaultFilm?.id ?? "");
  const visible = trailerEditions.filter((film) => seconds === null || film.seconds === seconds);
  const selected = visible.find((film) => film.id === selectedId) ?? visible[0];
  if (!selected) return null;
  return (
    <div id="editions" className="edition-gallery scroll-mt-28">
      <div className="edition-intro">
        <p className="eyebrow">The film library</p>
        <h2>One ecosystem. {trailerEditions.length} perspectives.</h2>
        <p>
          Four running times. Neural editions feature browser neural performances. Native30 Quesar
          editions pair native 30 fps motion with macOS Samantha narration. These films describe
          vision and roadmap; current capabilities are documented on the product pages.
        </p>
      </div>
      <div role="group" aria-label="Filter films by duration" className="edition-filters">
        {[null, ...durations].map((duration) => (
          <button
            key={duration ?? "all"}
            type="button"
            aria-pressed={seconds === duration}
            onClick={() => {
              setSeconds(duration);
              if (duration !== null && selected.seconds !== duration) {
                setSelectedId(trailerEditions.find((film) => film.seconds === duration)?.id ?? "");
              }
            }}
          >
            {duration === null
              ? `All ${trailerEditions.length} films`
              : `${duration / 60} min · ${trailerEditions.filter((film) => film.seconds === duration).length}`}
          </button>
        ))}
      </div>
      <div className="edition-layout">
        <div className="edition-feature" aria-live="polite">
          <div className="edition-feature-topline">
            <span>
              {selected.brand} / {selected.style} / {editionLabel(selected)}
            </span>
            <span>{selected.seconds / 60} min · 1080p</span>
          </div>
          <FilmPlayer key={selected.id} film={selected} />
          <div className="edition-feature-copy">
            <h3>{selected.title}</h3>
            <p>{selected.description}</p>
            <p className="edition-access-note">
              English captions and transcript available when you open the player. Playback begins
              only when you press play.
            </p>
          </div>
        </div>
        <div className="edition-index">
          <h3>
            Choose a film <span>{visible.length} shown</span>
          </h3>
          <ul>
            {visible.map((film, index) => (
              <li key={film.id}>
                <button
                  type="button"
                  aria-pressed={selected.id === film.id}
                  aria-label={`Select ${film.title}, ${film.brand}, ${editionLabel(film)}`}
                  onClick={() => setSelectedId(film.id)}
                >
                  <span className="edition-index-number">{String(index + 1).padStart(2, "0")}</span>
                  <img
                    src={film.poster}
                    width={160}
                    height={90}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="edition-index-copy">
                    <strong>{film.title}</strong>
                    <small>
                      {film.brand} / {film.style} / {editionLabel(film)}
                    </small>
                  </span>
                  <span className="edition-index-duration">{film.seconds / 60}m</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
