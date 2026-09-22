import { createFileRoute, Link } from "@tanstack/react-router";
import { PageClose, PageHero, RouteFrame, Section, Surface } from "@/components/site";
import { AppLink } from "@/components/site/app-link";
import { productJourneys, productPages } from "@/lib/mlai";
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
        eyebrow="Products"
        title="Four entries. Each with a limit."
        lede="Assistant orchestration, local assistance, durable memory and website creation. Each has its own setup and availability boundary. Local completion does not establish foundation-model quality."
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {productPages.map((product) => {
            const journey = productJourneys.find((item) => item.slug === product.slug);
            const accent = product.accent === "aviva" ? "abi" : product.accent;
            return (
              <Surface key={product.slug} accent={accent} className="flex h-full flex-col">
                <p className="font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase">{product.kicker}</p>
                <h2 className="mt-1 font-display text-3xl tracking-tight">
                  <Link to="/products/$slug" params={{ slug: product.slug }} className="text-fg no-underline hover:underline">
                    {product.name}
                  </Link>
                </h2>
                <p className="mt-3 text-base leading-relaxed text-fg">{journey?.purpose ?? product.intro}</p>
                {journey ? (
                  <>
                    <p className="mt-4 text-sm text-accent">{journey.availability}</p>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{journey.limitation}</p>
                  </>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-5 pt-6 text-sm">
                  <Link to="/products/$slug" params={{ slug: product.slug }} className="text-fg underline underline-offset-4">
                    Explore {product.name}
                  </Link>
                  {journey ? (
                    <AppLink to={journey.setupHref} className="text-accent underline underline-offset-4">
                      Setup documentation
                    </AppLink>
                  ) : null}
                </div>
              </Surface>
            );
          })}
        </div>
        <p className="mt-10 text-sm text-fg-muted">
          Choose by what you want to do: <Link to="/get-started" className="text-accent">Get started</Link>. Inspect the
          supporting <Link to="/research" className="text-accent">research collection</Link>.
        </p>
      </Section>
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        next={[
          { to: "/quesar", label: "Quesar", body: "The platform that makes the relationships obvious." },
          { to: "/apps", label: "Apps", body: "Working orientations of the shipping surfaces." },
        ]}
      />
    </RouteFrame>
  );
}
