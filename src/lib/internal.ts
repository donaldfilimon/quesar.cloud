import { pathForRepo } from "./catalog";

const HOSTS = [
  /^https?:\/\/github\.com\/donaldfilimon\/([^/#?]+)/i,
  /^https?:\/\/raw\.githubusercontent\.com\/donaldfilimon\/([^/#?]+)/i,
];

export function isGithubHref(href: string) {
  return /github\.com|githubusercontent\.com/i.test(href);
}

export function internalHref(href: string): string {
  if (!href) return "/";
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:")) return href;

  if (/donaldfilimon\.github\.io\/abi/i.test(href)) return "/abi";
  if (/quesar\.cloud/i.test(href)) {
    try {
      const url = new URL(href);
      return `${url.pathname}${url.hash}` || "/";
    } catch {
      return "/";
    }
  }

  for (const re of HOSTS) {
    const match = href.match(re);
    if (match?.[1]) return pathForRepo(match[1]);
  }

  if (isGithubHref(href)) return "/source";
  return href;
}

export function isExternal(href: string) {
  return /^(https?:)?\/\//i.test(href) && !isGithubHref(href) && !/quesar\.cloud/i.test(href);
}

/** Path-only redirects after sign-in. Reject protocol-relative and off-site values. */
export function safeInternalPath(path: string, fallback = "/console") {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\") || path.includes("://")) {
    return fallback;
  }
  if (path.startsWith("/api") || path.startsWith("/auth/")) return fallback;
  return path;
}
