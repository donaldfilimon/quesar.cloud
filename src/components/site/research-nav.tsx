import { Link } from "@tanstack/react-router";
import { research } from "@/lib/mlai/categories/research";
import { researchContext } from "@/lib/mlai/categories/research-context";
import { cn } from "@/lib/utils";

export function ResearchSidebar({ current }: { current?: string }) {
  return (
    <nav aria-label="Research" className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
      <Link to="/research" className="text-xs text-fg-subtle no-underline hover:text-fg">
        All research
      </Link>
      {research.tracks.map((track) => (
        <div key={track.id} className="mt-5">
          <p className="text-xs text-fg-subtle">{track.name}</p>
          <ul className="mt-2 space-y-0.5">
            {research.publications
              .filter((paper) => paper.topic === track.id)
              .map((paper) => {
                const active = paper.slug === current;
                return (
                  <li key={paper.slug}>
                    <Link
                      to="/research/$slug"
                      params={{ slug: paper.slug }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center rounded-md px-2 text-sm no-underline transition-colors",
                        active ? "bg-primary/10 text-fg" : "text-fg-muted hover:bg-muted hover:text-fg",
                      )}
                    >
                      {paper.documentType === "overview" ? track.name : paper.title}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
      <div className="mt-6">
        <Link
          to="/research/implementations"
          className="text-xs text-fg-subtle no-underline hover:text-fg"
        >
          Implementations
        </Link>
        <ul className="mt-2 space-y-0.5">
          {researchContext.map((item) => {
            const active = item.slug === current;
            return (
              <li key={item.slug}>
                <Link
                  to="/research/implementations/$slug"
                  params={{ slug: item.slug }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center rounded-md px-2 text-sm no-underline transition-colors",
                    active ? "bg-primary/10 text-fg" : "text-fg-muted hover:bg-muted hover:text-fg",
                  )}
                >
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
