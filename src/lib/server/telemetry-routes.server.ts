/**
 * The real route allowlist for telemetry, derived from `src/routes` file names.
 *
 * Only the glob KEYS are used. The lazy loaders are never called, and each
 * points at a route module the server bundle already contains. Server-only:
 * imported dynamically from the `/api/telemetry` handler.
 */
import { routePatternsFromFiles, type RoutePatterns } from "./telemetry-path";

let cached: RoutePatterns | undefined;

export function routeFiles(): string[] {
  return Object.keys(import.meta.glob("/src/routes/**/*.tsx"));
}

export function appRoutePatterns(): RoutePatterns {
  cached ??= routePatternsFromFiles(routeFiles());
  return cached;
}
