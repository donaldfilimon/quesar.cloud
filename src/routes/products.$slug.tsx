import { createFileRoute, notFound } from "@tanstack/react-router";
import { PersonaRouter } from "@/components/apps/persona-router";
import { CosineSimDemo } from "@/components/demos/cosine-sim-demo";
import { ShardingLatencyDemo } from "@/components/demos/sharding-latency-demo";
import { BlockMath } from "@/components/math/math";
import {
  ChipRow,
  NamedGrid,
  PageClose,
  PageHero,
  Section,
  Surface,
  TruthList,
} from "@/components/site";
import { NextUp } from "@/components/site/lab";
import { productJourneys, productPages, research } from "@/lib/mlai";
import { jsonLdScript, softwareApplicationLd } from "@/lib/mlai/structured-data";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/products/$slug")({
  beforeLoad: ({ params }) => {
    if (!productPages.some((item) => item.slug === params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const product = productPages.find((item) => item.slug === params.slug);
    return {
      ...pageHead(`${product?.name ?? "Product"} — Quesar`, product?.intro ?? "Quesar product."),
      scripts: product ? [jsonLdScript(softwareApplicationLd(product))] : [],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const product = productPages.find((item) => item.slug === slug);
  if (!product) throw notFound();
  const journey = productJourneys.find((item) => item.slug === product.slug);
  // Cross-navigation derives from the content layer (mlai Product.tsx), so it never points at this page.
  const next = [
    ...(journey
      ? [
          { to: journey.setupHref, label: "Setup documentation", body: journey.prerequisites },
          ...journey.researchSlugs.map((paperSlug) => ({
            to: `/research/${paperSlug}`,
            label: research.publications.find((paper) => paper.slug === paperSlug)?.title ?? paperSlug,
            body: "Read the supporting research and its limitations.",
          })),
        ]
      : []),
    { to: "/get-started", label: "Get started", body: "Choose your next step." },
    ...productPages
      .filter((item) => item.slug !== product.slug)
      .map((item) => ({ to: `/products/${item.slug}`, label: item.name, body: item.kicker })),
    { to: "/benchmarks", label: "WDBX benchmarks", body: "Configuration facts and interactive models, not a scoreboard." },
    { to: "/docs", label: "Documentation", body: "Platform and WDBX documentation." },
    { to: "/showcase", label: "The projection room", body: "The cinematic showcase surfaces." },
  ];
  return (
    <>
      <PageHero eyebrow={product.kicker} title={product.name} lede={product.intro} />
      {product.sections.map((section) => (
        <Section key={section.title} eyebrow={section.eyebrow} title={section.title} lede={section.sub}>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 40)} className="mt-3 max-w-3xl text-sm leading-relaxed text-fg-muted sm:text-base">
              {p}
            </p>
          ))}
          {section.equations?.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {section.equations.map((eq) => (
                <Surface key={eq.tex} className="h-full text-fg">
                  <div className="overflow-x-auto">
                    <BlockMath tex={eq.tex} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-fg-muted">{eq.note}</p>
                </Surface>
              ))}
            </div>
          ) : null}
          {section.blendTable ? (
            <div className="mt-6">
              <NamedGrid
                items={section.blendTable.map((row) => ({ name: row.range, body: row.meaning }))}
                columns=""
              />
            </div>
          ) : null}
          {section.pillars ? (
            <div className={section.pillars.length === 4 ? "mt-6 grid gap-4 sm:grid-cols-2" : "mt-6 grid gap-4 md:grid-cols-3"}>
              {section.pillars.map((pillar) => (
                <Surface
                  key={pillar.title}
                  accent={(pillar.accent ?? product.accent) === "aviva" ? "abi" : (pillar.accent ?? product.accent)}
                  className="flex h-full flex-col"
                >
                  <h3 className="font-display text-xl">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{pillar.description}</p>
                  {pillar.eq ? (
                    <div className="mt-auto overflow-x-auto pt-4 text-fg">
                      <BlockMath tex={pillar.eq} />
                    </div>
                  ) : null}
                </Surface>
              ))}
            </div>
          ) : null}
          {section.steps ? (
            <div className="mt-6">
              <TruthList items={section.steps.map((step) => ({ n: step.n, title: step.title, body: step.description }))} />
            </div>
          ) : null}
          {section.demo === "persona-router" ? (
            <div className="mt-6">
              <PersonaRouter />
            </div>
          ) : null}
          {section.demo === "cosine-sim" ? (
            <div className="mt-6 max-w-2xl">
              <CosineSimDemo />
            </div>
          ) : null}
          {section.demo === "sharding-latency" ? (
            <div className="mt-6 max-w-2xl">
              <ShardingLatencyDemo />
            </div>
          ) : null}
          {section.chips ? (
            <div className="mt-4">
              <ChipRow items={section.chips} />
            </div>
          ) : null}
        </Section>
      ))}
      <Section eyebrow="Next" title="Keep going.">
        <NextUp items={next} />
      </Section>
      <PageClose
        primary={{ to: "/products", label: "All products" }}
        next={[
          { to: "/architecture", label: "Architecture", body: "Place this product on the stack." },
          { to: "/apps", label: "Apps", body: "Working orientations of the same names." },
        ]}
      />
    </>
  );
}
