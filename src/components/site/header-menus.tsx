import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import * as Sheet from "@radix-ui/react-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TRIGGER_ATTR } from "./header-menus-loader";
import { extra, mobileLinks, mobileTriggerClass, navActive } from "./header-nav";
import { ThemeToggle } from "./theme-toggle";

// Loaded after hydration by header-menus-loader.ts; header.tsx and
// theme-toggle.tsx render plain triggers with the same markup until then.

export { Hint } from "@/components/ui/tooltip";

/** The desktop "More of the site" dropdown. */
export function MoreMenu({
  open,
  onOpenChange,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger className={className} {...{ [TRIGGER_ATTR]: "more" }}>
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
  );
}

/** The mobile navigation sheet; `children` is the trigger's content. */
export function MobileSheet({
  open,
  onOpenChange,
  pathname,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  children: ReactNode;
}) {
  return (
    <Sheet.Root open={open} onOpenChange={onOpenChange}>
      <Sheet.Trigger className={mobileTriggerClass} {...{ [TRIGGER_ATTR]: "menu" }}>
        {children}
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
                    onClick={() => onOpenChange(false)}
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
  );
}
