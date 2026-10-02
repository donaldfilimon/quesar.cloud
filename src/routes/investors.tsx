import { createFileRoute } from "@tanstack/react-router";
import { ArrChart } from "@/components/charts/arr-chart";
import { TamChart } from "@/components/charts/tam-chart";
import {
  JourneyRail,
  MetricCard,
  PageClose,
  PageHero,
  Section,
  SpecList,
  StatGrid,
} from "@/components/site";
import { ProvTag } from "@/components/site/prov-tag";
import { investor } from "@/lib/mlai/categories/investor";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/investors")({
  head: () =>
    pageHead(
      "Investors — MLAI",
      "MLAI planning notes: illustrative financial assumptions, source reports, and proposed acceptance work.",
    ),
  component: InvestorsPage,
});

function InvestorsPage() {
  return (
    <>
      <PageHero
        eyebrow="Investors"
        title="An engineer who tells you the truth, including the parts that are still a target."
        lede="Figures on this page are illustrative planning assumptions and source reports. They are not validated market sizing, operating results, bookings, or a validated forecast."
      >
        <div className="mt-6 flex flex-wrap gap-2">
          <ProvTag tag="target" />
          <ProvTag tag="reported" />
        </div>
      </PageHero>
      <JourneyRail current="investors" />

      <Section
        eyebrow="Planning scenario"
        title={investor.entity}
        lede="These are illustrative design assumptions, not validated market sizing or reachable revenue."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <ProvTag tag="target" />
        </div>
        <TamChart />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {investor.market.map((row) => (
            <MetricCard key={row.k} k={row.k} v={row.v} note={row.note}>
              <ProvTag tag={row.tag} />
            </MetricCard>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Raise"
        title={`${investor.raise.round} ${investor.raise.amount}`}
        lede="Use of funds is a plan, not a spend record."
      >
        <div className="mb-4">
          <ProvTag tag="target" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {investor.funds.map((row) => (
            <MetricCard key={row.k} k={row.k} v={row.v} sub={row.p} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Unit economics"
        title="Unit economics planning assumptions."
        lede="These targets have no reproduced operating result in this draft."
      >
        <div className="mb-4">
          <ProvTag tag="target" />
        </div>
        <SpecList rows={investor.unit} />
      </Section>

      <Section
        eyebrow="ARR projection"
        title="Million-dollar figures, tagged as targets."
        lede="These values are illustrative planning targets. They are not bookings, observed revenue, or a validated forecast."
      >
        <div className="mb-4">
          <ProvTag tag="target" />
        </div>
        <ArrChart />
        <p className="mt-3 text-xs text-fg-subtle">
          Million-dollar ARR figures on this chart are targets, not results.
        </p>
        <div className="mt-4">
          <StatGrid
            cells={investor.arr.map((row) => ({
              k: row.year,
              v: `$${row.v}M`,
              tag: "target" as const,
            }))}
            columns="grid-cols-2 sm:grid-cols-5"
          />
        </div>
      </Section>

      <Section eyebrow="Founder" title="Source reports and proposed acceptance.">
        <ul className="space-y-3">
          {investor.founder.map((row) => (
            <li
              key={row.k}
              className="surface flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <span className="text-sm text-fg">{row.k}</span>
              <ProvTag tag={row.tag} />
            </li>
          ))}
        </ul>
      </Section>
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        secondary={[
          { to: "/developers", label: "Developers" },
          { to: "/skill-creator", label: "Skill composer" },
        ]}
        next={[
          { to: "/console", label: "Console", body: "Sign in and keep a node-level observation." },
          { to: "/company", label: "Company", body: "Entity, team, and public path." },
          { to: "/contact", label: "Contact", body: "Source is the public path." },
        ]}
      />
    </>
  );
}
