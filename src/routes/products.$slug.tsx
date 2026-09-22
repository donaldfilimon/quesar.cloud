import { createFileRoute, notFound } from "@tanstack/react-router";
import { PersonaRouter } from "@/components/apps/persona-router";
import { Equation } from "@/components/site/article";
import {
  ChipRow,
  CopyGrid,
  NamedGrid,
  PageClose,
  PageHero,
  Section,
  Surface,
  TruthList,
} from "@/components/site";
import { productPages } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/products/$slug")({
  beforeLoad: ({ params }) => {
    if (!productPages.some((item) => item.slug === params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const product = productPages.find((item) => item.slug === params.slug);
    return pageHead(`${product?.name ?? "Product"} — Quesar`, product?.intro ?? "Quesar product.");
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const product = productPages.find((item) => item.slug === slug);
  if (!product) throw notFound();
  const accent = product.accent === "aviva" ? "abi" : product.accent;
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
          {section.equations?.map((eq) => (
            <Equation key={eq.tex} tex={eq.tex} note={eq.note} />
          ))}
          {section.blendTable ? (
            <div className="mt-6">
              <NamedGrid
                items={section.blendTable.map((row) => ({ name: row.range, body: row.meaning }))}
                columns=""
              />
            </div>
          ) : null}
          {section.pillars ? (
            <div className="mt-6">
              <CopyGrid
                items={section.pillars.map((pillar) => ({
                  title: pillar.title,
                  body: pillar.description,
                  note: pillar.eq,
                  accent: pillar.accent === "aviva" ? "abi" : pillar.accent,
                }))}
                columns="md:grid-cols-3"
              />
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
            <Surface accent={accent} className="mt-6">
              <p className="font-mono text-sm">cos(θ) = (A · B) / (‖A‖ ‖B‖)</p>
              <p className="mt-2 text-sm text-fg-muted">Configuration fact for the active crate, not a recall scoreboard.</p>
            </Surface>
          ) : null}
          {section.demo === "sharding-latency" ? (
            <Surface className="mt-6">
              <p className="text-sm text-fg-muted">
                Reference cluster replication exists in source. It does not establish production sharding or a latency SLA.
              </p>
            </Surface>
          ) : null}
          {section.chips ? (
            <div className="mt-4">
              <ChipRow items={section.chips} />
            </div>
          ) : null}
        </Section>
      ))}
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
