import { Link } from "@tanstack/react-router";
import { docs } from "@/lib/mlai/categories/docs";
import { cn, headingId } from "@/lib/utils";

/** Docs grouped for the sidebar, in the order they appear in `docs`. */
const docGroups = docs.reduce<{ group: string; items: typeof docs }[]>((groups, doc) => {
  const last = groups.at(-1);
  if (last?.group === doc.group) last.items.push(doc);
  else groups.push({ group: doc.group, items: [doc] });
  return groups;
}, []);

export function DocSidebar({ current }: { current?: string }) {
  return (
    <nav
      aria-label="Docs"
      className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
    >
      {docGroups.map((group) => (
        <div key={group.group} className="mb-6">
          <p className="text-xs text-fg-subtle">{group.group}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const active = current === item.slug;
              return (
                <li key={item.slug}>
                  <Link
                    to="/docs/$slug"
                    params={{ slug: item.slug }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-md px-2 text-sm no-underline transition-colors",
                      active
                        ? "bg-primary/10 text-fg"
                        : "text-fg-muted hover:bg-muted hover:text-fg",
                    )}
                  >
                    {item.navLabel}
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
            <a
              href={`#${headingId(heading)}`}
              className="text-sm text-fg-muted no-underline hover:text-fg"
            >
              {heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
