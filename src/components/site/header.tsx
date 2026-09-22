import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { nav } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hint } from "@/components/ui/tooltip";
import { AuthSlot } from "./auth-slot";
import { Logo } from "./logo";
import { SiteSearch } from "./search";
import { ThemeToggle } from "./theme-toggle";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const linkClass =
  "nav-link rounded-sm px-2.5 py-2 text-sm no-underline transition-[color,background-color] duration-150";

function navActive(to: string, pathname: string) {
  if (to === "/research") {
    return pathname === "/research" || (pathname.startsWith("/research/") && !pathname.startsWith("/research/implementations"));
  }
  if (to === "/docs" || to === "/apps" || to === "/research/implementations") {
    return pathname === to || pathname.startsWith(`${to}/`);
  }
  return pathname === to;
}

const extra = [
  { to: "/architecture", label: "Architecture" },
  { to: "/research", label: "Research" },
  { to: "/research/implementations", label: "Implementations" },
  { to: "/docs", label: "Documents" },
  { to: "/dashboard", label: "Desk" },
  { to: "/console", label: "Console" },
  { to: "/workspace", label: "Workspace" },
  { to: "/investors", label: "Investors" },
  { to: "/developers", label: "Developers" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/78 backdrop-blur-md">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(linkClass, "text-fg-muted hover:text-fg data-[status=active]:bg-primary/10 data-[status=active]:text-fg")}
                activeOptions={{ exact: item.to !== "/docs" && item.to !== "/apps" }}
              >
                {item.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  linkClass,
                  extra.some((item) => navActive(item.to, pathname))
                    ? "bg-primary/10 text-fg"
                    : "text-fg-muted hover:text-fg",
                )}
              >More</DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Journeys</DropdownMenuLabel>
                {extra.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} className="w-full no-underline">
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/contact" className="w-full no-underline">
                    Contact
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <div className="flex items-center gap-1">
            <Hint label={user ? "Signed in. Console notes, chat and audits stay on your account." : "Sign in to use the console."}>
              <span
                tabIndex={0}
                className="mr-2 hidden items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase xl:inline-flex"
              >
                <i className="size-1.5 rounded-full bg-status-current" aria-hidden="true" />
                {user ? "Signed in · field notes" : "Local · no session"}
              </span>
            </Hint>
            <SiteSearch />
            <AuthSlot />
            <ThemeToggle />
            <CollapsibleTrigger className="inline-flex size-11 items-center justify-center rounded-md text-fg lg:hidden">
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              {open ? <X className="size-5" strokeWidth={1.75} /> : <Menu className="size-5" strokeWidth={1.75} />}
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="mobile-panel lg:hidden">
          <nav className="border-t border-border px-4 py-3" aria-label="Mobile">
            <ul className="flex flex-col">
              {nav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex min-h-11 items-center rounded-md px-3 text-base no-underline",
                      navActive(item.to, pathname) ? "bg-primary/10 text-fg" : "text-fg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {extra.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex min-h-11 items-center rounded-md px-3 text-base no-underline",
                      navActive(item.to, pathname) ? "bg-primary/10 text-fg" : "text-fg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </CollapsibleContent>
      </Collapsible>
    </header>
  );
}
