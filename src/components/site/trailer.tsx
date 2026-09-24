import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { filmCuts, type FilmCut } from "./film-cuts";

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function Trailer({
  className = "",
  full = false,
  start = "mark",
}: {
  className?: string;
  full?: boolean;
  start?: FilmCut;
}) {
  const cuts = full ? filmCuts : filmCuts.filter((cut) => cut.id === "mark");
  const videoRef = useRef<HTMLVideoElement>(null);
  const resume = useRef(false);
  const playRequest = useRef(0);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      cuts.findIndex((cut) => cut.id === start),
    ),
  );
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cut = cuts[index] ?? cuts[0];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.load();
    playRequest.current++;
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setError(null);
  }, [cut.src]);

  function play(video: HTMLVideoElement) {
    const request = ++playRequest.current;
    setError(null);
    void video.play().catch(() => {
      if (videoRef.current !== video || playRequest.current !== request) return;
      setPlaying(false);
      setError("Playback could not start.");
    });
  }

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      play(video);
    } else {
      video.pause();
      playRequest.current++;
    }
  }

  function choose(next: number) {
    resume.current = false;
    playRequest.current++;
    videoRef.current?.pause();
    setIndex(next);
  }

  function mediaError(video: HTMLVideoElement) {
    if (video !== videoRef.current) return;
    resume.current = false;
    playRequest.current++;
    setPlaying(false);
    setError("This film could not load.");
  }
  const seekable = Number.isFinite(duration) && duration > 0 && !error;

  return (
    <figure className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="relative bg-black">
        <video
          key={cut.id}
          ref={videoRef}
          className="aspect-video w-full object-cover"
          poster={cut.poster}
          muted={muted}
          playsInline
          preload="metadata"
          aria-label={`Quesar film, ${cut.title}`}
          onTimeUpdate={(event) => {
            if (event.currentTarget === videoRef.current) setTime(event.currentTarget.currentTime);
          }}
          onLoadedMetadata={(event) => {
            if (event.currentTarget === videoRef.current) setDuration(event.currentTarget.duration);
          }}
          onDurationChange={(event) => {
            if (event.currentTarget === videoRef.current) setDuration(event.currentTarget.duration);
          }}
          onPlay={(event) => {
            if (event.currentTarget === videoRef.current) setPlaying(true);
          }}
          onPause={(event) => {
            if (event.currentTarget === videoRef.current) setPlaying(false);
          }}
          onError={(event) => mediaError(event.currentTarget)}
          onLoadedData={(event) => {
            if (event.currentTarget !== videoRef.current) return;
            if (!resume.current) return;
            resume.current = false;
            play(event.currentTarget);
          }}
          onEnded={(event) => {
            if (event.currentTarget !== videoRef.current) return;
            playRequest.current++;
            setPlaying(false);
            if (index < cuts.length - 1) {
              resume.current = true;
              setIndex(index + 1);
            } else setPlaying(false);
          }}
        >
          <source
            src={cut.src}
            type="video/mp4"
            onError={() => {
              if (videoRef.current?.querySelector("source")?.getAttribute("src") === cut.src) {
                mediaError(videoRef.current);
              }
            }}
          />
          <track
            kind="captions"
            srcLang="en"
            label="English"
            src={`/media/${cut.id}.vtt`}
            default
          />
        </video>
        <button
          type="button"
          onClick={toggle}
          className="group absolute inset-0 grid place-items-center text-white"
          aria-label={playing ? "Pause trailer" : "Play trailer"}
        >
          <span
            className={cn(
              "grid size-12 place-items-center rounded-full bg-black/55 backdrop-blur-sm sm:size-16",
              playing &&
                "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
          >
            {playing ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
          </span>
        </button>
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 text-white sm:gap-3 sm:px-3 sm:py-3">
          <span className="font-mono text-[11px] tabular-nums">
            {clock(time)} / {clock(duration)}
          </span>
          <input
            aria-label="Seek"
            type="range"
            min={0}
            max={seekable ? duration : 0}
            step={0.1}
            value={seekable && Number.isFinite(time) ? Math.min(time, duration) : 0}
            disabled={!seekable}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!seekable) return;
              if (videoRef.current) videoRef.current.currentTime = next;
              setTime(next);
            }}
            className="h-1 flex-1 accent-primary"
          />
          <button
            type="button"
            className="grid size-11 place-items-center"
            aria-label="Mute trailer"
            aria-pressed={muted}
            onClick={() => setMuted((value) => !value)}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>
      <figcaption className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        {error ? (
          <div>
            <p role="alert" className="text-sm text-fg">
              {error}
            </p>
            <button
              type="button"
              className="min-h-11 text-sm text-primary"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                resume.current = false;
                video.load();
                play(video);
              }}
            >
              Retry playback
            </button>
          </div>
        ) : null}
        <div>
          <p className="text-xs text-primary">{cut.title}</p>
          <p className="mt-2 max-w-[66ch] text-base leading-7 text-fg">{cut.caption}</p>
        </div>
        {cuts.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Trailer chapters">
            {cuts.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                aria-current={itemIndex === index ? "true" : undefined}
                onClick={() => choose(itemIndex)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  itemIndex === index
                    ? "bg-primary/15 text-fg"
                    : "text-fg-muted hover:bg-muted hover:text-fg",
                )}
              >
                {itemIndex + 1}. {item.title}
              </button>
            ))}
          </div>
        ) : (
          <Link
            to="/showcase/trailer"
            className="text-sm text-primary no-underline hover:underline"
          >
            Watch the full trailer
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
