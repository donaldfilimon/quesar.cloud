import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { nav } from "@/lib/site-identity";
import { cn } from "@/lib/utils";
import { AuthSlot } from "./auth-slot";
import {
  loadHeaderMenus,
  TRIGGER_ATTR,
  useHeaderMenus,
  useLoadHeaderMenusWhenIdle,
} from "./header-menus-loader";
import { extra, linkClass, mobileTriggerClass, navActive } from "./header-nav";
import { Logo } from "./logo";
import { SiteSearch } from "./search";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // The Radix overlays load after hydration; until then the triggers below
  // are plain buttons with the same markup (see header-menus-loader.ts).
  const menus = useHeaderMenus();
  useLoadHeaderMenusWhenIdle();

  // Close the mobile sheet on navigation (adjusted during render, not in an effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const moreClass = cn(
    linkClass,
    extra.some((item) => navActive(item.to, pathname)) ? "text-fg" : "text-fg-muted hover:text-fg",
  );
  const menuIcon = (
    <>
      <span className="sr-only">Open menu</span>
      <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
    </>
  );

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
          {menus ? (
            <menus.MoreMenu open={moreOpen} onOpenChange={setMoreOpen} className={moreClass} />
          ) : (
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              data-state={moreOpen ? "open" : "closed"}
              className={moreClass}
              {...{ [TRIGGER_ATTR]: "more" }}
              onPointerEnter={loadHeaderMenus}
              onFocus={loadHeaderMenus}
              onClick={() => {
                setMoreOpen(true);
                loadHeaderMenus();
              }}
            >
              More
            </button>
          )}
        </nav>
        <div className="flex shrink-0 items-center sm:gap-1">
          <SiteSearch />
          <AuthSlot />
          <ThemeToggle className="hidden sm:inline-flex" />
          {menus ? (
            <menus.MobileSheet open={open} onOpenChange={setOpen} pathname={pathname}>
              {menuIcon}
            </menus.MobileSheet>
          ) : (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              data-state={open ? "open" : "closed"}
              className={mobileTriggerClass}
              {...{ [TRIGGER_ATTR]: "menu" }}
              onPointerEnter={loadHeaderMenus}
              onFocus={loadHeaderMenus}
              onClick={() => {
                setOpen(true);
                loadHeaderMenus();
              }}
            >
              {menuIcon}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
