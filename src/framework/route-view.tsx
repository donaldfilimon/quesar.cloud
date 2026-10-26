"use client";

import { use } from "react";
import { canonicalUrl } from "@/lib/seo";
import { rootHead } from "./root-head";
import {
  RouteMatchContext,
  useHydrated,
  useRouterState,
  type HeadDescriptor,
  type RouteOptions,
} from "./router";

/**
 * A route as its source file exports it (`RouteApi<path, loader, search>`); only
 * `options` is read here, so every route's generic type is accepted.
 */
interface MountedRoute {
  options: object;
}

type Meta = Record<string, string | undefined>;

/** TanStack's HeadContent rule: a later tag with the same title/name/property replaces the earlier one. */
function metaKey(meta: Meta): string | null {
  if ("title" in meta) return "title";
  if (meta.charSet) return "charset";
  if (meta.name) return `name:${meta.name}${meta.media ? `@${meta.media}` : ""}`;
  if (meta.property) return `property:${meta.property}`;
  return null;
}

function mergeHead(...heads: Array<HeadDescriptor | undefined>) {
  const meta = new Map<string, Meta>();
  const loose: Meta[] = [];
  const links: Meta[] = [];
  const scripts: NonNullable<HeadDescriptor["scripts"]> = [];
  for (const head of heads) {
    for (const entry of head?.meta ?? []) {
      const key = metaKey(entry);
      if (key) {
        meta.delete(key);
        meta.set(key, entry);
      } else loose.push(entry);
    }
    links.push(...(head?.links ?? []));
    scripts.push(...(head?.scripts ?? []));
  }
  return { meta: [...meta.values(), ...loose], links, scripts };
}

/** React 19 hoists these into `<head>`, during prerender and on client navigation alike. */
export function HeadTags({
  head,
  canonical = true,
}: {
  head: HeadDescriptor | undefined;
  /** Off for the 404 page, which has no canonical address. */
  canonical?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const merged = mergeHead(rootHead, head);
  const href = canonicalUrl(pathname);
  return (
    <>
      {merged.meta.map((entry, index) =>
        "title" in entry ? (
          <title key="title">{entry.title}</title>
        ) : (
          <meta key={metaKey(entry) ?? `meta-${index}`} {...entry} />
        ),
      )}
      {merged.links.map((link, index) => (
        <link key={`${link.rel}-${link.href}-${index}`} {...link} />
      ))}
      {canonical ? (
        <>
          <link rel="canonical" href={href} />
          <meta property="og:url" content={href} />
        </>
      ) : null}
      {merged.scripts.map((script, index) =>
        script.src ? (
          <script key={script.src} src={script.src} type={script.type} async />
        ) : (
          <script
            key={`inline-${index}`}
            type={script.type}
            dangerouslySetInnerHTML={{ __html: script.children ?? "" }}
          />
        ),
      )}
    </>
  );
}

const isPromise = (value: unknown): value is Promise<unknown> =>
  Boolean(value && typeof (value as Promise<unknown>).then === "function");

/**
 * Loader results by route and params. Async loaders (`/login` asks the server for
 * its sign-in methods) return a promise that `use()` suspends on; it must be the
 * same promise on every render, or the page would suspend forever. A rejected
 * load is dropped so the next visit retries.
 */
const loads = new WeakMap<RouteOptions, Map<string, unknown>>();
function loadOnce(options: RouteOptions, params: Record<string, string>): unknown {
  if (!options.loader) return undefined;
  let byParams = loads.get(options);
  if (!byParams) loads.set(options, (byParams = new Map()));
  const key = JSON.stringify(params);
  if (!byParams.has(key)) {
    const value = options.loader({ params });
    byParams.set(key, value);
    if (isPromise(value)) value.catch(() => byParams.delete(key));
    // Sync loaders read static data; they re-run cheaply, so only promises are kept.
    else byParams.delete(key);
    return value;
  }
  return byParams.get(key);
}

function RouteBody({ options }: { options: RouteOptions }) {
  const Component = options.component;
  return Component ? <Component /> : null;
}

/** One route module as a Next page: loader, head and component, under the route's params. */
export function RouteView({
  route,
  params = {},
}: {
  route: MountedRoute;
  params?: Record<string, string>;
}) {
  const hydrated = useHydrated();
  const options = route.options as RouteOptions;
  const loaded = loadOnce(options, params);
  const loaderData = isPromise(loaded) ? use(loaded) : loaded;
  const head = options.head?.({ params, loaderData });
  const clientOnly = options.ssr === false;
  return (
    <>
      <HeadTags head={head} />
      {clientOnly && !hydrated ? null : (
        <RouteMatchContext value={{ params, loaderData }}>
          <RouteBody options={options} />
        </RouteMatchContext>
      )}
    </>
  );
}
