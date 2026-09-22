import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const journeys = [
  { id: "home", to: "/", label: "Home" },
  { id: "architecture", to: "/architecture", label: "Architecture" },
  { id: "console", to: "/console", label: "Field notes" },
  { id: "investors", to: "/investors", label: "Investors" },
  { id: "developers", to: "/developers", label: "Developers" },
] as const;

export function JourneyRail({ current }: { current: (typeof journeys)[number]["id"] }) {
  return (
    <nav aria-label="Orientation journeys" className="border-b border-border">
      <ScrollArea className="mx-auto w-full max-w-6xl">
        <ul className="flex w-max gap-1 px-4 sm:px-6">
          {journeys.map((item) => (
            <li key={item.id}>
              <Link
                to={item.to}
                className={cn(
                  "inline-flex h-11 items-center px-3 text-sm no-underline",
                  current === item.id ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
                aria-current={current === item.id ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </nav>
  );
}
