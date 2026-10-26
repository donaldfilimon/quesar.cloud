"use client";

/**
 * The site's route API on the Next.js App Router. Route modules in `src/routes`
 * declare `createFileRoute(path)({ loader, head, validateSearch, component })`
 * (the shape they had on TanStack Router, which this replaced; see
 * notes/superpowers/specs/2026-10-26-nextjs-app-router-port.md), and
 * `scripts/next-routes.ts` generates the `app/` pages that mount them through
 * `RouteView` (./route-view.tsx), which supplies the params and loader data that
 * `Route.useParams()` / `useLoaderData()` read. Navigation is Next's.
 */
import NextLink from "next/link";
import {
  notFound as nextNotFound,
  redirect as nextRedirect,
  usePathname,
  useRouter as useNextRouter,
} from "next/navigation";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from "react";

type Params = Record<string, string>;
type Search = Record<string, unknown>;
type SearchInput = Search | true | ((prev: Search) => Search) | undefined;

/** Params named in a route path: `/research/$slug` → `{ slug: string }`; a bare `$` is `_splat`. */
export type PathParams<P extends string> = P extends `${string}/$${infer Rest}`
  ? Rest extends `${infer Name}/${infer Tail}`
    ? Record<Name extends "" ? "_splat" : Name, string> & PathParams<`/${Tail}`>
    : Record<Rest extends "" ? "_splat" : Rest, string>
  : Record<never, string>;

export interface ErrorComponentProps {
  error: unknown;
  reset: () => void;
}

export interface HeadDescriptor {
  meta?: Array<Record<string, string | undefined>>;
  links?: Array<Record<string, string | undefined>>;
  scripts?: Array<{ type?: string; children?: string; src?: string }>;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
type ServerHandler<P extends string> = (ctx: {
  request: Request;
  params: PathParams<P>;
}) => Response | Promise<Response>;

export interface RouteOptions<
  P extends string = string,
  TLoader = unknown,
  TSearch extends Search = Search,
> {
  component?: ComponentType;
  loader?: (ctx: { params: PathParams<P> }) => TLoader;
  head?: (ctx: {
    params: PathParams<P>;
    loaderData: Awaited<TLoader> | undefined;
  }) => HeadDescriptor;
  validateSearch?: (search: Search) => TSearch;
  /** `false` renders the route only after hydration. */
  ssr?: boolean;
  notFoundComponent?: ComponentType;
  /** Server routes: route handlers by method (generated as `app/**\/route.server.ts`). */
  server?: { handlers?: Partial<Record<Method, ServerHandler<P>>> };
  /** Accepted for source compatibility; Next splits each page into its own chunk. */
  codeSplitGroupings?: unknown;
}

/* ---------------------------------------------------------------- search */

/** TanStack's default search serialisation: JSON for non-strings, and for strings that would parse as JSON. */
function encodeSearchValue(value: unknown): string {
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return JSON.stringify(value);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value);
}

export function stringifySearch(search: Search): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) continue;
    query.set(key, encodeSearchValue(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function parseSearch(searchStr: string): Search {
  const search: Search = {};
  for (const [key, raw] of new URLSearchParams(searchStr)) {
    try {
      search[key] = JSON.parse(raw);
    } catch {
      search[key] = raw;
    }
  }
  return search;
}

/** The query string lives outside React: popstate and our own navigations notify it. */
const SEARCH_EVENT = "quesar:search";
function subscribeSearch(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(SEARCH_EVENT, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(SEARCH_EVENT, notify);
  };
}
/** Prerendered HTML has no query string; the browser value takes over after hydration. */
function useSearchStr(): string {
  return useSyncExternalStore(
    subscribeSearch,
    () => window.location.search,
    () => "",
  );
}
export function notifySearchChange() {
  window.dispatchEvent(new Event(SEARCH_EVENT));
}

/* ------------------------------------------------------------------ hrefs */

function interpolate(path: string, params?: Params): string {
  return path.replace(/\$([A-Za-z0-9_]+)/g, (_, name: string) =>
    encodeURIComponent(params?.[name] ?? ""),
  );
}

interface NavigateOptions {
  to?: string;
  params?: Params;
  search?: SearchInput;
  hash?: string;
  replace?: boolean;
}

function buildHref(options: NavigateOptions, current: { pathname: string; search: Search }) {
  const pathname = options.to ? interpolate(options.to, options.params) : current.pathname;
  let search: Search = {};
  if (options.search === true) search = current.search;
  else if (typeof options.search === "function") search = options.search(current.search);
  else if (options.search) search = options.search;
  const hash = options.hash ? `#${options.hash.replace(/^#/, "")}` : "";
  return `${pathname}${stringifySearch(search)}${hash}`;
}

/* ------------------------------------------------------------- route data */

interface RouteMatch {
  params: Params;
  loaderData: unknown;
}
export const RouteMatchContext = createContext<RouteMatch>({ params: {}, loaderData: undefined });

export interface RouteApi<
  P extends string = string,
  TLoader = unknown,
  TSearch extends Search = Search,
> {
  readonly id: P;
  readonly fullPath: P;
  options: RouteOptions<P, TLoader, TSearch>;
  useParams: () => PathParams<P>;
  useLoaderData: () => Awaited<TLoader>;
  useSearch: () => TSearch;
  useNavigate: () => ReturnType<typeof useNavigate>;
}

/**
 * Every page route by id, for `getRouteApi`; augmented by the generated
 * `./route-registry.gen.ts`, as TanStack's `routeTree.gen.ts` registered routes.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RouteRegistry {}

const registry = new Map<string, { options: RouteOptions }>();

function useRouteSearch(id: string, fallback: RouteOptions): Search {
  const raw = useSearchStr();
  // `getRouteApi` handles resolve to the registered route at call time.
  const validate = (registry.get(id)?.options ?? fallback).validateSearch;
  return useMemo(() => {
    const parsed = parseSearch(raw);
    return validate ? validate(parsed) : parsed;
  }, [raw, validate]);
}

function routeApi(id: string, options: RouteOptions = {}): RouteApi {
  return {
    id,
    fullPath: id,
    options,
    useParams: () => useContext(RouteMatchContext).params,
    useLoaderData: () => useContext(RouteMatchContext).loaderData,
    useSearch: () => useRouteSearch(id, options),
    useNavigate: () => useNavigate(),
  };
}

export function createFileRoute<P extends string>(id: P) {
  return <TLoader = undefined, TSearch extends Search = Search>(
    options: RouteOptions<P, TLoader, TSearch>,
  ): RouteApi<P, TLoader, TSearch> => {
    const route = routeApi(id, options as RouteOptions);
    registry.set(id, route);
    return route as unknown as RouteApi<P, TLoader, TSearch>;
  };
}

export function getRouteApi<K extends keyof RouteRegistry & string>(id: K): RouteRegistry[K] {
  return routeApi(id) as RouteRegistry[K];
}

/**
 * Each Next page renders one leaf route. Parent routes here only fall through to
 * `<Outlet />` when a child matches (`RouteFrame`, `/console`), so a parent never
 * has children and its outlet is empty.
 */
export function Outlet() {
  return null;
}

export function useChildMatches(): unknown[] {
  return [];
}

/* ------------------------------------------------------------------ hooks */

const noopSubscribe = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

interface LocationState {
  pathname: string;
  search: Search;
  searchStr: string;
  hash: string;
  href: string;
}

function useLocationState(): LocationState {
  const pathname = usePathname() ?? "/";
  const searchStr = useSearchStr();
  return useMemo(
    () => ({
      pathname,
      search: parseSearch(searchStr),
      searchStr,
      hash: typeof window === "undefined" ? "" : window.location.hash,
      href: `${pathname}${searchStr}`,
    }),
    [pathname, searchStr],
  );
}

export function useRouterState<T = { location: LocationState }>(
  options: { select?: (state: { location: LocationState }) => T } = {},
): T {
  const state = { location: useLocationState() };
  return options.select ? options.select(state) : (state as T);
}

/** `from` is accepted for source compatibility: navigation without `to` stays on the current path. */
export function useNavigate(_options?: { from?: string }) {
  const router = useNextRouter();
  const location = useLocationState();
  return useCallback(
    async (options: NavigateOptions) => {
      const href = buildHref(options, location);
      if (options.replace) router.replace(href, { scroll: false });
      else router.push(href);
      // Next updates the URL asynchronously; let search readers catch up once it has.
      queueMicrotask(notifySearchChange);
      setTimeout(notifySearchChange, 0);
    },
    [router, location],
  );
}

export function useRouter() {
  const router = useNextRouter();
  const navigate = useNavigate();
  const location = useLocationState();
  return {
    navigate,
    invalidate: async () => router.refresh(),
    history: { back: () => router.back() },
    state: { location },
  };
}

/* ------------------------------------------------------------------- Link */

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to?: string;
  params?: Params;
  search?: SearchInput;
  hash?: string;
  replace?: boolean;
  preload?: unknown;
  resetScroll?: boolean;
  /** Merged in when the link matches the current path; `className` is appended. */
  activeProps?: AnchorHTMLAttributes<HTMLAnchorElement> & Record<string, unknown>;
  /** `exact: false` (the default) also matches child paths. */
  activeOptions?: { exact?: boolean; includeHash?: boolean; includeSearch?: boolean };
  children?: ReactNode;
};

function isActive(pathname: string, target: string, exact: boolean) {
  const path = target.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const current = pathname.replace(/\/+$/, "") || "/";
  if (exact || path === "/") return current === path;
  return current === path || current.startsWith(`${path}/`);
}

/**
 * TanStack's `defaultPreload: "intent"`: no viewport prefetching (a page carries
 * dozens of header and footer links); the route payload loads on hover or focus.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    to,
    params,
    search,
    hash,
    replace,
    preload: _preload,
    resetScroll,
    onClick,
    onPointerEnter,
    onFocus,
    activeProps,
    activeOptions,
    className,
    children,
    ...rest
  },
  ref,
) {
  const router = useNextRouter();
  const location = useLocationState();
  const href = buildHref({ to, params, search, hash }, location);
  const internal = href.startsWith("/");
  const active =
    internal && isActive(location.pathname, href, activeOptions?.exact ?? false)
      ? activeProps
      : undefined;
  const { className: activeClassName, ...activeRest } = active ?? {};
  return (
    <NextLink
      ref={ref}
      href={href}
      replace={replace}
      prefetch={false}
      scroll={resetScroll !== false}
      onClick={(event) => {
        onClick?.(event);
        setTimeout(notifySearchChange, 0);
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (internal) router.prefetch(href);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (internal) router.prefetch(href);
      }}
      {...rest}
      {...activeRest}
      className={[className, activeClassName].filter(Boolean).join(" ") || undefined}
    >
      {children}
    </NextLink>
  );
});

/** Client-side redirect on mount, as TanStack's `<Navigate>`. */
export function Navigate(options: NavigateOptions) {
  const navigate = useNavigate();
  const target = buildHref(options, { pathname: "/", search: {} });
  useEffect(() => {
    void navigate({ ...options, to: options.to, replace: options.replace ?? true });
    // Navigate once per target; the options object is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

/* -------------------------------------------------------------- throwing */

export function notFound(): never {
  nextNotFound();
}

export function redirect(options: NavigateOptions & { statusCode?: number }): never {
  nextRedirect(buildHref(options, { pathname: "/", search: {} }));
}
