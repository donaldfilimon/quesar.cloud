import { Link } from "@tanstack/react-router";
import { docNav } from "@/lib/mlai/categories/docs-nav";
import { cn } from "@/lib/utils";
import { docHref } from "./doc-href";

export function DocSidebar({ current }: { current?: string }) {
  return (
    <nav aria-label="Docs" className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
      {docNav.map((group) => (
        <div key={group.group} className="mb-6">
          <p className="text-xs text-fg-subtle">{group.group}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const slug = docHref(item.id);
              const active = current === slug;
              return (
                <li key={item.id}>
                  <Link
                    to="/docs/$slug"
                    params={{ slug }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-md px-2 text-sm no-underline transition-colors",
                      active ? "bg-primary/10 text-fg" : "text-fg-muted hover:bg-muted hover:text-fg",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocOutline({ headings }: { headings: readonly string[] }) {
  if (!headings.length) return null;
  return (
    <nav aria-label="On this page" className="mt-8 hidden xl:block">
      <p className="text-xs text-fg-subtle">On this page</p>
      <ul className="mt-2 space-y-1">
        {headings.map((heading) => (
          <li key={heading}>
            <a href={`#${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="text-sm text-fg-muted no-underline hover:text-fg">
              {heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
