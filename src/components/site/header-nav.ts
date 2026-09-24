import { nav } from "@/lib/content";

export const linkClass =
  "nav-link rounded-sm px-2.5 py-2 text-sm no-underline transition-[color,background-color] duration-150";

export const mobileTriggerClass =
  "inline-flex size-11 items-center justify-center rounded-md text-fg lg:hidden";

export function navActive(to: string, pathname: string) {
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

export const extra = [
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
export const mobileLinks = [...nav, ...extra, { to: "/contact", label: "Contact" }].filter(
  (item, index, all) => all.findIndex((other) => other.to === item.to) === index,
);
