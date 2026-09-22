import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Ticks({ className }: { className?: string }) {
  return (
    <div className={cn("ticks", className)} aria-hidden="true">
      <i className="tick tick-tl" />
      <i className="tick tick-tr" />
      <i className="tick tick-bl" />
      <i className="tick tick-br" />
    </div>
  );
}

export function Instrument({
  serial,
  status,
  caption,
  className,
  children,
}: {
  serial: string;
  status?: string;
  caption?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={cn("instrument", className)}>
      <div className="instrument-chrome">
        <span className="font-bold text-accent">{serial}</span>
        {status ? <span className="text-fg-subtle">{status}</span> : null}
      </div>
      <div className="instrument-body">
        <Ticks />
        {children}
      </div>
      {caption ? <figcaption className="instrument-caption">{caption}</figcaption> : null}
    </figure>
  );
}

export function Readout({ k, v }: { k: string; v: string }) {
  return (
    <div className="readout">
      <span className="readout-k">{k}</span>
      <span className="readout-v">{v}</span>
    </div>
  );
}

export function AtmosphereMedia({
  still,
  video,
  className,
}: {
  still: string;
  video?: string;
  className?: string;
}) {
  return (
    <div className={cn("atmosphere-media", className)} aria-hidden="true">
      <img src={still} alt="" />
      {video ? (
        <video autoPlay muted loop playsInline preload="metadata" poster={still}>
          <source src={video} type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}
