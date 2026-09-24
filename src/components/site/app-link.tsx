import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { internalHref, isExternal } from "@/lib/internal";

export function AppLink({
  to,
  className,
  children,
  external = false,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  const href = external ? to : internalHref(to);
  if (external || isExternal(href)) {
    return (
      <a href={href} className={className} rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={href as never} className={className}>
      {children}
    </Link>
  );
}
