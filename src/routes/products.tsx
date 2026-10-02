import { clientExperience } from "@/lib/mlai/categories/client-experience";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageClose, PageHero, RouteFrame, Section, Surface } from "@/components/site";
import { AppLink } from "@/components/site/app-link";
import { productJourneys } from "@/lib/mlai/categories/product-journeys";
import { products as productPages } from "@/lib/mlai/categories/products";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/products")({
  head: () =>
    pageHead(
      "Products — Quesar, ABI, Abbey, WDBX",
      "Product journeys for ABI, Abbey, WDBX, and Quasar with availability and limits named.",
    ),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <RouteFrame>
      <PageHero
        eyebrow={clientExperience.landingIntros.products.eyebrow}
        title={clientExperience.landingIntros.products.title}
        lede={clientExperience.landingIntros.products.lede}
      />
      <Section>
        <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
          {clientExperience.landingIntros.products.availability}
        </p>
        <a
          href={clientExperience.landingIntros.products.sources[0]}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm text-accent underline underline-offset-4"
        >
          Inspect the source behind this page
        </a>
      </Section>
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {productPages.map((product) => {
            const journey = productJourneys.find((item) => item.slug === product.slug);
            const accent = product.accent === "aviva" ? "abi" : product.accent;
            return (
              <Surface key={product.slug} accent={accent} className="flex h-full flex-col">
                <p className="text-xs text-fg-subtle">{product.kicker}</p>
                <h2 className="mt-1 font-display text-3xl tracking-tight">
                  <Link
                    to="/products/$slug"
                    params={{ slug: product.slug }}
                    className="text-fg no-underline hover:underline"
                  >
                    {product.name}
                  </Link>
                </h2>
                <p className="mt-3 text-base leading-relaxed text-fg">
                  {journey?.purpose ?? product.intro}
                </p>
                {journey ? (
                  <>
                    <p className="mt-4 text-sm text-accent">{journey.availability}</p>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                      {journey.limitation}
                    </p>
                  </>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-5 pt-6 text-sm">
                  <Link
                    to="/products/$slug"
                    params={{ slug: product.slug }}
                    className="text-fg underline underline-offset-4"
                  >
                    Explore {product.name}
                  </Link>
                  {journey ? (
                    <AppLink
                      to={journey.setupHref}
                      className="text-accent underline underline-offset-4"
                    >
                      Setup documentation
                    </AppLink>
                  ) : null}
                </div>
              </Surface>
            );
          })}
        </div>
        <p className="mt-10 text-sm text-fg-muted">
          Choose by what you want to do:{" "}
          <Link to="/get-started" className="text-accent underline underline-offset-4">
            Get started
          </Link>
          . Inspect the supporting{" "}
          <Link to="/research" className="text-accent underline underline-offset-4">
            research collection
          </Link>
          .
        </p>
      </Section>
      <PageClose
        primary={{ to: "/contact", label: "Discuss your project" }}
        secondary={[
          { to: "/architecture", label: "Architecture" },
          { to: "/docs", label: "Documentation" },
        ]}
        next={[
          {
            to: "/quesar",
            label: "Quesar",
            body: "Inspect the product overview and its implementation boundaries.",
          },
          {
            to: "/apps",
            label: "Apps",
            body: "Preview app surfaces and inspect their setup requirements.",
          },
        ]}
      />
    </RouteFrame>
  );
}
