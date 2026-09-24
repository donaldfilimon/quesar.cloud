import { useState } from "react";
import { cn } from "@/lib/utils";

/** Portrait with an initials fallback if the image fails to load. Ported from mlai Team/FounderProfile. */
export function ProfilePhoto({
  name,
  image,
  className,
}: {
  name: string;
  image: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className={cn("relative overflow-hidden rounded-2xl shadow-border", className)}>
      {failed ? (
        <div
          className="flex h-full w-full items-center justify-center bg-bg-elevated"
          role="img"
          aria-label={name}
        >
          <span className="font-display text-4xl text-fg-muted">{initials}</span>
        </div>
      ) : (
        <img
          src={image}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover grayscale transition-[filter] duration-700 hover:grayscale-0 motion-reduce:transition-none"
        />
      )}
    </div>
  );
}
