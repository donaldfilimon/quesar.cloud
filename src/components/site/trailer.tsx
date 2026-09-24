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
  const cut = cuts[index] ?? cuts[0];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.load();
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, [cut.src]);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function choose(next: number) {
    setIndex(next);
  }

  return (
    <figure className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="relative bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          poster={cut.poster}
          muted={muted}
          playsInline
          preload="metadata"
          aria-label={`Quesar film, ${cut.title}`}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedData={() => {
            if (!resume.current) return;
            resume.current = false;
            void videoRef.current?.play();
          }}
          onEnded={() => {
            if (index < cuts.length - 1) {
              resume.current = true;
              setIndex(index + 1);
            } else setPlaying(false);
          }}
        >
          <source src={cut.src} type="video/mp4" />
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
          className="absolute inset-0 grid place-items-center text-white"
          aria-label={playing ? "Pause trailer" : "Play trailer"}
        >
          <span
            className={cn(
              "grid size-12 place-items-center rounded-full bg-black/55 backdrop-blur-sm sm:size-16",
              playing && "opacity-0 transition-opacity hover:opacity-100",
            )}
          >
            {playing ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
          </span>
        </button>
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 text-white sm:gap-3 sm:px-3 sm:py-3">
          <span className="font-mono text-11 tabular-nums">
            {clock(time)} / {clock(duration)}
          </span>
          <input
            aria-label="Seek"
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (videoRef.current) videoRef.current.currentTime = next;
              setTime(next);
            }}
            className="h-1 flex-1 accent-primary"
          />
          <button
            type="button"
            className="grid size-8 place-items-center"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted((value) => !value)}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>
      <figcaption className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs text-primary">{cut.title}</p>
          <p className="mt-2 max-w-[66ch] text-base leading-7 text-fg">{cut.caption}</p>
        </div>
        {cuts.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trailer chapters">
            {cuts.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={itemIndex === index}
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
