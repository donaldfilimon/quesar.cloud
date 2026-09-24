import { pathForRepo } from "./catalog";

const HOSTS = [
  /^https?:\/\/github\.com\/donaldfilimon\/([^/#?]+)/i,
  /^https?:\/\/raw\.githubusercontent\.com\/donaldfilimon\/([^/#?]+)/i,
];

/** True for `quesar.cloud` and its subdomains, not for URLs that merely mention it. */
function isSiteHost(href: string) {
  try {
    const { hostname } = new URL(href);
    return hostname === "quesar.cloud" || hostname.endsWith(".quesar.cloud");
  } catch {
    return false;
  }
}

/** An absolute http(s) URL, as opposed to a site route. */
export function isAbsoluteUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

export function isGithubHref(href: string) {
  return /github\.com|githubusercontent\.com/i.test(href);
}

export function internalHref(href: string): string {
  if (!href) return "/";
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:")) return href;

  if (/donaldfilimon\.github\.io\/abi/i.test(href)) return "/abi";
  if (isSiteHost(href)) {
    const url = new URL(href);
    return `${url.pathname}${url.hash}` || "/";
  }

  for (const re of HOSTS) {
    const match = href.match(re);
    if (match?.[1]) return pathForRepo(match[1]);
  }

  if (isGithubHref(href)) return "/source";
  return href;
}

export function isExternal(href: string) {
  return /^(https?:)?\/\//i.test(href) && !isGithubHref(href) && !isSiteHost(href);
}

/** Path-only redirects after sign-in. Reject protocol-relative and off-site values. */
export function safeInternalPath(path: string, fallback = "/console") {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\") ||
    path.includes("://")
  ) {
    return fallback;
  }
  if (path.startsWith("/api") || path.startsWith("/auth/")) return fallback;
  // Never bounce back into the sign-in page itself (a nested ?next= loop).
  if (path === "/login" || path.startsWith("/login?") || path.startsWith("/login/"))
    return fallback;
  return path;
}
