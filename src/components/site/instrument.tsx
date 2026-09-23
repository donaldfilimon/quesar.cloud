import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
        <span className="font-medium text-fg">{serial}</span>
        {status ? <span className="text-fg-subtle">{status}</span> : null}
      </div>
      <div className="instrument-body">{children}</div>
      {caption ? <figcaption className="instrument-caption">{caption}</figcaption> : null}
    </figure>
  );
}

