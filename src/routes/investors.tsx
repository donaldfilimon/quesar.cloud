import { createFileRoute } from "@tanstack/react-router";
import { ArrChart } from "@/components/charts/arr-chart";
import { TamChart } from "@/components/charts/tam-chart";
import { JourneyRail, MetricCard, PageClose, PageHero, Section, SpecList, StatGrid } from "@/components/site";
import { ProvTag } from "@/components/site/prov-tag";
import { investor } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/investors")({
  head: () =>
    pageHead(
      "Investors — MLAI Corporation",
      "MLAI investor notes: entity, founder evidence, and unit-economics targets. ARR and TAM figures are tagged — a target is never a result.",
    ),
  component: InvestorsPage,
});

function InvestorsPage() {
  return (
    <>
      <PageHero
        eyebrow="Investors"
        title="An engineer who tells you the truth, including the parts that are still a target."
        lede="Figures on this page come from the public skill-creator master reference. Every number is tagged. ARR, unit economics, and the 295× GPU figure are targets. They are not results."
      >
        <div className="mt-6 flex flex-wrap gap-2">
          <ProvTag tag="measured" />
          <ProvTag tag="target" />
          <ProvTag tag="reported" />
        </div>
      </PageHero>
      <JourneyRail current="investors" />

      <Section eyebrow="Entity" title={investor.entity} lede="TAM, SAM, and SOM are category sizing. None of them is a booking.">
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

      <Section eyebrow="Raise" title={`${investor.raise.round} ${investor.raise.amount}`} lede="Use of funds is a plan, not a spend record.">
        <div className="mb-4">
          <ProvTag tag="target" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {investor.funds.map((row) => (
            <MetricCard key={row.k} k={row.k} v={row.v} sub={row.p} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Unit economics" title="All four are targets." lede="Nothing here is a measured operating result.">
        <div className="mb-4">
          <ProvTag tag="target" />
        </div>
        <SpecList rows={investor.unit} />
      </Section>

      <Section
        eyebrow="ARR projection"
        title="Million-dollar figures, tagged as targets."
        lede="A projection is not a booking. Do not cite these as revenue."
      >
        <div className="mb-4">
          <ProvTag tag="target" />
        </div>
        <ArrChart />
        <p className="mt-3 text-xs text-fg-subtle">Million-dollar ARR figures on this chart are targets, not results.</p>
        <div className="mt-4">
          <StatGrid
            cells={investor.arr.map((row) => ({ k: row.year, v: `$${row.v}M`, tag: "target" as const }))}
            columns="grid-cols-2 sm:grid-cols-5"
          />
        </div>
      </Section>

      <Section eyebrow="Founder" title="What is measured.">
        <ul className="space-y-3">
          {investor.founder.map((row) => (
            <li key={row.k} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
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
          { to: "/skill-creator", label: "Master reference" },
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
