import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { investor } from "@/lib/content";
import { ProvTag } from "@/components/site/prov-tag";
import { ThreeStatementModelDemo } from "@/components/demos/three-statement-model-demo";
import { about } from "@/lib/mlai";

export const Route = createFileRoute("/financial-model")({
  head: () => ({
    meta: [
      { title: "Financial model — MLAI" },
      { name: "description", content: "Unit-economics targets and ARR projection, every figure tagged, plus an interactive three-statement model on illustrative sample data for a fictional company." },
      { name: "robots", content: "noindex" },
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
              <p className="text-xs text-fg-subtle">{row.year}</p>
              <p className="mt-2 font-display text-2xl tabular">${row.v}M</p>
            </div>
          ))}
        </div>
      </Section>
      <Section
        id="three-statement-model"
        eyebrow="Interactive tool"
        title="The model recalculates itself."
        lede="An integrated three-statement model (income statement, balance sheet and cash flow) wired together in the browser. Flip the scenario and every projected line re-derives from the assumption drivers; cash is the cash-flow plug, so assets = liabilities + equity holds in every case. The figures are illustrative sample data for a fictional company, not Quesar's or MLAI's financials."
      >
        <ThreeStatementModelDemo />
      </Section>
      <PageClose
        primary={{ to: "/investors", label: "Investor notes" }}
        next={[{ to: "/company", label: "Company", body: "Registration-level facts beside the model." }]}
      />
    </>
  );
}
