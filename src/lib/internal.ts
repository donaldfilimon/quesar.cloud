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

function isGithubHref(href: string) {
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
    path.includes("\\") ||
    [...path].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  ) {
    return fallback;
  }
  try {
    const base = "https://quesar.cloud";
    const url = new URL(path, base);
    if (url.origin !== base || url.pathname.startsWith("//")) return fallback;
    // Encoded separators or controls must not gain meaning in a route decoder.
    if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(url.pathname)) return fallback;
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    // Check the normalized route, including encoded names and dot segments.
    if (
      ["/api", "/auth", "/login", "/signup"].some(
        (entry) => pathname === entry || pathname.startsWith(`${entry}/`),
      )
    )
      return fallback;
    const target = `${url.pathname}${url.search}${url.hash}`;
    // A path-only return value is parsed again by navigation. Its interpretation
    // must not become off-origin after removing the absolute URL's origin.
    if (new URL(target, base).origin !== base) return fallback;
    return target;
  } catch {
    return fallback;
  }
}
