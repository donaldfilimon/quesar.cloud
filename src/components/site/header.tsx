import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { nav } from "@/lib/content";
import { cn } from "@/lib/utils";
import * as Sheet from "@radix-ui/react-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthSlot } from "./auth-slot";
import { Logo } from "./logo";
import { SiteSearch } from "./search";
import { ThemeToggle } from "./theme-toggle";

const linkClass =
  "nav-link rounded-sm px-2.5 py-2 text-sm no-underline transition-[color,background-color] duration-150";

function navActive(to: string, pathname: string) {
  if (to === "/research") {
    return (
      pathname === "/research" ||
      (pathname.startsWith("/research/") && !pathname.startsWith("/research/implementations"))
    );
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

/** Primary nav, then the "More" destinations, then contact: each path once. */
const mobileLinks = [...nav, ...extra, { to: "/contact", label: "Contact" }].filter(
  (item, index, all) => all.findIndex((other) => other.to === item.to) === index,
);

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  // Close the mobile sheet on navigation (adjusted during render, not in an effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(linkClass, "text-fg-muted hover:text-fg data-[status=active]:text-fg")}
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
                  ? "text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>More of the site</DropdownMenuLabel>
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
        <div className="flex shrink-0 items-center sm:gap-1">
          <SiteSearch />
          <AuthSlot />
          <ThemeToggle className="hidden sm:inline-flex" />
          <Sheet.Root open={open} onOpenChange={setOpen}>
            <Sheet.Trigger className="inline-flex size-11 items-center justify-center rounded-md text-fg lg:hidden">
              <span className="sr-only">Open menu</span>
              <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </Sheet.Trigger>
            <Sheet.Portal>
              <Sheet.Overlay className="fixed inset-0 z-[80] bg-fg/20 lg:hidden" />
              <Sheet.Content
                className="fixed inset-y-0 right-0 z-[81] flex w-[min(22rem,100vw)] flex-col border-l border-border bg-bg text-fg lg:hidden"
                aria-describedby={undefined}
              >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
                  <Sheet.Title className="font-display text-lg">Menu</Sheet.Title>
                  <Sheet.Close className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted hover:text-fg">
                    <span className="sr-only">Close menu</span>
                    <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </Sheet.Close>
                </div>
                <nav
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3"
                  aria-label="Mobile"
                >
                  <ul className="flex flex-col">
                    {mobileLinks.map((item) => (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setOpen(false)}
                          aria-current={navActive(item.to, pathname) ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center rounded-md px-3 text-base no-underline",
                            navActive(item.to, pathname)
                              ? "bg-muted text-fg"
                              : "text-fg-muted hover:text-fg",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2 sm:hidden">
                  <span className="text-sm text-fg-muted">Theme</span>
                  <ThemeToggle />
                </div>
              </Sheet.Content>
            </Sheet.Portal>
          </Sheet.Root>
        </div>
      </div>
    </header>
  );
}
