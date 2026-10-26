import { repoPaths } from "@/lib/catalog";
import { blog } from "@/lib/mlai/categories/blog";
import { docs } from "@/lib/mlai/categories/docs";
import { products } from "@/lib/mlai/categories/products";
import { projects } from "@/lib/mlai/categories/projects";
import { research } from "@/lib/mlai/categories/research";
import { researchContext } from "@/lib/mlai/categories/research-context";
import { team } from "@/lib/mlai/categories/team";

/**
 * `generateStaticParams` for each dynamic route, read from the same datasets the
 * route loaders look items up in. (The Vite build this replaced found these pages
 * by crawling links; `bun run check:parity` compares a new export with `docs/`.)
 */
const bySlug = (items: ReadonlyArray<{ slug?: string }>) =>
  items.flatMap(({ slug }) => (slug ? [{ slug }] : []));

export const staticParams: Record<string, () => Array<Record<string, string>>> = {
  "/blog/$slug": () => bySlug(blog),
  "/docs/$slug": () => bySlug(docs),
  "/products/$slug": () => bySlug(products),
  "/projects/$slug": () => bySlug(projects),
  "/research/$slug": () => bySlug(research.publications),
  "/research/implementations/$slug": () => bySlug(researchContext),
  "/team/$slug": () => bySlug(team),
  // Every canonical `/source/*` target in `repoPaths`. The GitHub panels link to
  // them at runtime (`pathForRepo`); the Vite crawl only reached the four that
  // static pages link, so the other twelve were 404s on the published site.
  "/source/$name": () =>
    [
      ...new Set(
        Object.values(repoPaths)
          .filter((path) => path.startsWith("/source/"))
          .map((path) => decodeURIComponent(path.slice("/source/".length))),
      ),
    ].map((name) => ({ name })),
};
