import { Link } from "@tanstack/react-router";

export function Crumbs({ items }: { items: readonly { to?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-border">
      <ol className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-sm sm:px-6">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-fg-subtle">
                  /
                </span>
              ) : null}
              {item.to && !last ? (
                <Link to={item.to as never} className="text-fg-muted no-underline hover:text-fg">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={last ? "text-fg" : "text-fg-muted"}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
