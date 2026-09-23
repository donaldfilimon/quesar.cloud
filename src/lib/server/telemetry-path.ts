/**
 * Path allowlisting for the telemetry sink (ported from mlai
 * `lib/server/telemetry-path.ts`).
 *
 * `telemetry_events` is privacy-by-design: allowlisted event + pathname +
 * timestamp, and no identifiers. `path` arrives from an anonymous body, so it
 * is allowlisted against the real route set exactly like `event` is; otherwise
 * `{"path":"/u/victim@example.com"}` would be stored verbatim and later shown
 * to an admin.
 *
 * mlai checked static paths against its `routeMetadata` register. This app has
 * no such register, so the allowlist is derived from the file-route names in
 * `src/routes` (see `telemetry-routes.server.ts`) and cannot drift as routes are
 * added. Dynamic `$param` segments match STRUCTURALLY: one lowercase,
 * hyphen-separated slug, which cannot carry an "@", a ".", a space or a second
 * segment.
 *
 * Anything else normalizes to `""`; the request is not rejected.
 */

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";

/** No real route is longer; used as a rejection bound, never a truncation. */
const MAX_PATH_LENGTH = 128;

export interface RoutePatterns {
  staticPaths: Set<string>;
  dynamic: RegExp[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Turn TanStack file-route names into matchers. Handles the flat (`a.b.tsx`)
 * and directory (`a/b.tsx`) forms, `index`, `route`, `$param`, pathless
 * `_layout` segments, `(group)` folders and trailing-underscore escapes.
 * Skips `__root`, `-`-prefixed (ignored) files, splats (`$`) and `api/*`.
 */
export function routePatternsFromFiles(files: Iterable<string>): RoutePatterns {
  const staticPaths = new Set<string>();
  const dynamic: RegExp[] = [];

  for (const file of files) {
    const rel = file
      .replace(/^.*?src\/routes\//, "")
      .replace(/^\/+/, "")
      .replace(/\.(tsx|ts|jsx|js)$/, "");
    const raw = rel.split(/[/.]/);
    if (raw.some((segment) => segment === "__root" || segment.startsWith("-"))) continue;
    if (raw[0] === "api") continue;

    const segments: string[] = [];
    let splat = false;
    for (let segment of raw) {
      if (!segment || segment === "index" || segment === "route") continue;
      if (/^\(.*\)$/.test(segment)) continue; // route group
      if (segment.startsWith("_")) continue; // pathless layout
      if (segment.endsWith("_")) segment = segment.slice(0, -1); // un-nesting escape
      if (segment === "$") {
        splat = true;
        break;
      }
      segments.push(segment);
    }
    if (splat) continue;

    if (segments.some((segment) => segment.startsWith("$"))) {
      const pattern = segments
        .map((segment) => (segment.startsWith("$") ? SLUG : escapeRegExp(segment)))
        .join("/");
      dynamic.push(new RegExp(`^/${pattern}$`));
    } else {
      staticPaths.add(`/${segments.join("/")}`);
    }
  }
  return { staticPaths, dynamic };
}

/** Map a client-supplied `path` onto a known route, or `""`. */
export function normalizeTelemetryPath(value: unknown, patterns: RoutePatterns): string {
  if (typeof value !== "string") return "";

  // A query or fragment is discarded outright: that is where identifiers hide.
  // What survives still has to match the allowlist below.
  let path = value.split(/[?#]/)[0]!;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return "";
  if (patterns.staticPaths.has(path)) return path;
  return patterns.dynamic.some((pattern) => pattern.test(path)) ? path : "";
}
