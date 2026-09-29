import { Link } from "@tanstack/react-router";
import { Mic, Play } from "lucide-react";
import { showcaseProgram, showcaseReels, showcaseVoice } from "@/lib/mlai/pages";

/**
 * The projection-room poster wall from mlai `src/views/Showcase.tsx`. Each
 * poster is a real frame of its room, captured from the built site (not
 * concept art). framer-motion entrances became the `.stagger-in` CSS
 * animation, which the stylesheet disables under `prefers-reduced-motion`.
 */
export function ShowcaseWall() {
  return (
    <div className="grid gap-8">
      <dl className="surface grid grid-cols-3 divide-x divide-border overflow-hidden">
        {showcaseProgram.map((row) => (
          <div key={row.k} className="px-4 py-3">
            <dt className="text-xs text-fg-subtle">{row.k}</dt>
            <dd className="mt-1 font-mono text-sm text-fg">{row.v}</dd>
          </div>
        ))}
      </dl>
      <ul className="stagger-in grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {showcaseReels.map((reel) => {
          const room = reel.href.replace("/showcase/", "");
          return (
            <li key={reel.href}>
              <Link
                to={reel.href}
                className="surface surface-hover group flex h-full flex-col overflow-hidden no-underline"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
                  <span className="text-xs text-fg-subtle">Reel {reel.reel}</span>
                  <span aria-hidden="true" className="flex gap-1.5">
                    {[0, 1, 2, 3].map((d) => (
                      <span key={d} className="h-1.5 w-2.5 rounded-[2px] bg-fg/12" />
                    ))}
                  </span>
                </div>
                <div className="relative aspect-video overflow-hidden border-b border-border bg-black">
                  <img
                    src={`/media/rooms/${room}.webp`}
                    alt=""
                    width={960}
                    height={540}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-2xl tracking-tight text-fg">{reel.title}</h2>
                    <span className="text-xs text-fg-subtle">{reel.duration}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-fg-muted">{reel.body}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-3 text-xs text-accent">
                    Enter room
                    <Play
                      className="size-3 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
        <li>
          <div className="surface flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
              <span className="text-xs text-accent">Voice system</span>
              <Mic className="size-3.5 text-accent" aria-hidden="true" />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <h2 className="font-display text-2xl tracking-tight text-fg">
                {showcaseVoice.title}
              </h2>
              <p className="text-sm leading-relaxed text-fg-muted">{showcaseVoice.body}</p>
              <p className="mt-auto border-t border-border pt-4 font-mono text-11 leading-relaxed text-fg-subtle">
                {showcaseVoice.keys}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}
