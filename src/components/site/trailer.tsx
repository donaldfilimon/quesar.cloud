import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Captions, CaptionsOff, Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { filmCuts, type FilmCut } from "./film-cuts";

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--";
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
  const [duration, setDuration] = useState(Number.NaN);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(true);
  const [cue, setCue] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const cut = cuts[index] ?? cuts[0];

  // Moving to another cut: `key={cut.id}` remounts the <video>, which loads the
  // new cut by itself, so only the player's own state resets here, and any
  // pending play() is orphaned.
  function goTo(next: number) {
    playRequest.current++;
    setPlaying(false);
    setTime(0);
    setDuration(Number.NaN);
    setError(null);
    setCue("");
    setIndex(next);
  }

  // The description track is read, not rendered by the browser: browsers do
  // not draw `descriptions` cues, so the active cue is shown by the player and
  // the CC button toggles it.
  useEffect(() => {
    const track = videoRef.current?.textTracks[0];
    if (!track) return;
    track.mode = "hidden";
    const onCue = () => {
      const active = track.activeCues?.[0] as VTTCue | undefined;
      setCue(active?.text ?? "");
    };
    track.addEventListener("cuechange", onCue);
    return () => track.removeEventListener("cuechange", onCue);
  }, [cut.id]);

  // The browser tries the sources in order, and only the last one failing
  // means the cut cannot play. On the prerendered page that can happen before
  // hydration, when no React handler exists yet, so the check runs once after
  // mount and a native listener covers later failures. NETWORK_NO_SOURCE alone
  // is not failure (a fresh element reports it while it picks a source); with
  // the last source as currentSrc, every source has been tried.
  useEffect(() => {
    const video = videoRef.current;
    const last = video?.querySelector("source:last-of-type");
    if (!video || !(last instanceof HTMLSourceElement)) return;
    const onFailed = () => mediaError(video);
    const frame = requestAnimationFrame(() => {
      const exhausted =
        video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && video.currentSrc === last.src;
      if (exhausted) onFailed();
    });
    last.addEventListener("error", onFailed);
    return () => {
      cancelAnimationFrame(frame);
      last.removeEventListener("error", onFailed);
    };
  }, [cut.id]);

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
    videoRef.current?.pause();
    goTo(next);
  }

  function mediaError(video: HTMLVideoElement) {
    if (video !== videoRef.current) return;
    resume.current = false;
    playRequest.current++;
    setPlaying(false);
    setError("This film could not load.");
  }
  const seekable = Number.isFinite(duration) && duration > 0 && !error;

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video || !seekable) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), duration);
  }

  function fullscreen() {
    const frame = frameRef.current;
    const video = videoRef.current as
      (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (frame?.requestFullscreen) void frame.requestFullscreen();
    // iOS Safari has no element fullscreen, only the video's own player.
    else video?.webkitEnterFullscreen?.();
  }

  // Shortcuts while focus is in the player. A focused button owns Space and
  // Enter, and the seek slider owns the arrows, so those stay native.
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const onControl = target.closest("button, input");
    const key = event.key.toLowerCase();
    if ((key === " " || key === "k") && !onControl) toggle();
    else if (key === "arrowleft" && !onControl) seekBy(-5);
    else if (key === "arrowright" && !onControl) seekBy(5);
    else if (key === "f") fullscreen();
    else if (key === "m" && cut.hasAudio) setMuted((value) => !value);
    else if (key === "c") setShowText((value) => !value);
    else return;
    event.preventDefault();
  }

  return (
    <figure className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div
        ref={frameRef}
        className="relative bg-black"
        onKeyDown={onKeyDown}
        aria-keyshortcuts="Space K ArrowLeft ArrowRight F M C"
      >
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
              goTo(index + 1);
            } else setPlaying(false);
          }}
        >
          {cut.sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
          <track kind="descriptions" srcLang="en" label="English descriptions" src={cut.track} />
        </video>
        {showText && cue ? (
          <p className="pointer-events-none absolute inset-x-4 bottom-16 z-10 mx-auto max-w-[40ch] rounded-md bg-black/70 px-3 py-1.5 text-center text-sm text-white sm:bottom-20 sm:text-base">
            {cue}
          </p>
        ) : null}
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
          <span className="font-mono text-11 tabular-nums">
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
            aria-label="Show descriptions"
            aria-pressed={showText}
            onClick={() => setShowText((value) => !value)}
          >
            {showText ? <Captions className="size-4" /> : <CaptionsOff className="size-4" />}
          </button>
          {cut.hasAudio ? (
            <button
              type="button"
              className="grid size-11 place-items-center"
              aria-label="Mute trailer"
              aria-pressed={muted}
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          ) : null}
          <button
            type="button"
            className="grid size-11 place-items-center"
            aria-label="Full screen"
            onClick={fullscreen}
          >
            <Maximize className="size-4" />
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
          <Link to="/showcase" className="text-sm text-primary no-underline hover:underline">
            Watch all three cuts
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
