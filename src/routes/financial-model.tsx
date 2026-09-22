import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { investor } from "@/lib/content";
import { ProvTag } from "@/components/site/prov-tag";
import { about } from "@/lib/mlai";

export const Route = createFileRoute("/financial-model")({
  head: () => ({
    meta: [
      { title: "Financial model — MLAI" },
      { name: "description", content: "Unit-economics targets and ARR projection. Every figure is tagged. A target is never a result." },
    ],
  }),
  component: FinancialModelPage,
});

function FinancialModelPage() {
  return (
    <>
      <PageHero
        eyebrow="Financial model"
        title="Targets, written as targets."
        lede="ARR, unit economics, and TAM figures on this page are tagged. Do not cite them as bookings."
      >
        <div className="mt-6">
          <ProvTag tag="target" />
        </div>
      </PageHero>
      <Section eyebrow="Thesis" title="Why on-device changes the cost curve.">
        <div className="grid gap-4 md:grid-cols-3">
          {about.investorThesis.map((card) => (
            <Surface key={card.title}>
              <h3 className="font-display text-xl">{card.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{card.description}</p>
            </Surface>
          ))}
        </div>
      </Section>
      <Section eyebrow="ARR" title="Projection, not revenue.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {investor.arr.map((row) => (
            <div key={row.year} className="surface p-4 text-center">
              <p className="font-mono text-[10px] uppercase text-fg-subtle">{row.year}</p>
              <p className="mt-2 font-display text-2xl tabular">${row.v}M</p>
            </div>
          ))}
        </div>
      </Section>
      <PageClose
        primary={{ to: "/investors", label: "Investor notes" }}
        next={[{ to: "/company", label: "Company", body: "Registration-level facts beside the model." }]}
      />
    </>
  );
}
