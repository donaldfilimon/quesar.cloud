import { createFileRoute } from "@tanstack/react-router";
import { CopyGrid, PageClose, PageHero, RouteFrame, Section } from "@/components/site";
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
        lede="Public entry points belong to this website. Source setup remains authoritative. Local completion does not establish foundation-model quality."
      />
      <Section>
        <CopyGrid
          items={productPages.map((product) => {
            const journey = productJourneys.find((item) => item.slug === product.slug);
            return {
              title: product.name,
              body: product.intro,
              kicker: product.kicker,
              href: `/products/${product.slug}`,
              accent: product.accent === "aviva" ? "abi" : product.accent,
              note: journey?.limitation,
            };
          })}
        />
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
