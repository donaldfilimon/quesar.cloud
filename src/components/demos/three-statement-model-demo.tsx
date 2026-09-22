import { useMemo, useState, type ReactNode } from "react";
import { CircleCheck, CircleAlert } from "lucide-react";
import { DRIVERS, balanceCheck, buildModel, cashTieCheck, type Drivers, type Period, type Scenario } from "./three-statement-model";

/** Renders the integrated three-statement model from `./three-statement-model`. Illustrative only. */
// ---- Formatting ----
const money = (v: number) =>
  // Collapse negative zero and sub-rounding float dust to a clean 0.0.
  (Math.abs(v) < 0.05 ? 0 : v).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const mult = (v: number) => `${v.toFixed(1)}x`;

type RowKind = "money" | "pct" | "mult";
type RowStyle = "normal" | "subtotal" | "muted";

interface RowProps {
  label: string;
  periods: Period[];
  get: (p: Period) => number | null;
  kind?: RowKind;
  style?: RowStyle;
  indent?: boolean;
}

function fmt(v: number, kind: RowKind): string {
  if (kind === "pct") return pct(v);
  if (kind === "mult") return mult(v);
  return money(v);
}

function DataRow({ label, periods, get, kind = "money", style = "normal", indent }: RowProps) {
  const labelCls =
    style === "subtotal"
      ? "font-semibold text-fg"
      : style === "muted"
        ? "text-fg-subtle"
        : "text-fg-muted";
  const valCls = style === "subtotal" ? "font-semibold text-fg" : "text-fg";
  return (
    <tr className={style === "subtotal" ? "border-t border-border" : undefined}>
      <th
        scope="row"
        className={`sticky left-0 z-10 bg-bg py-1.5 pr-4 text-left text-xs font-normal ${labelCls} ${indent ? "pl-6" : "pl-2"}`}
      >
        {label}
      </th>
      {periods.map((p) => {
        const v = get(p);
        return (
          <td
            key={p.label}
            className={`whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs tabular-nums ${valCls} ${p.isActual ? "bg-accent/5" : ""}`}
          >
            {v === null ? <span className="text-fg-subtle">—</span> : fmt(v, kind)}
          </td>
        );
      })}
    </tr>
  );
}

function SectionRow({ title, span }: { title: string; span: number }) {
  return (
    <tr>
      <td
        colSpan={span}
        className="sticky left-0 bg-accent/10 px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-widest text-accent"
      >
        {title}
      </td>
    </tr>
  );
}

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: "downside", label: "Downside" },
  { id: "base", label: "Base" },
  { id: "upside", label: "Upside" },
];

// The assumption drivers surfaced to the reader, in display order. These are
// the *inputs* — everything in the statements below is derived from them, so
// toggling the scenario shows exactly which knobs move.
const DRIVER_VIEW: { key: keyof Drivers; label: string; kind: "pct" | "days" }[] = [
  { key: "revenueGrowth", label: "Revenue growth", kind: "pct" },
  { key: "grossMargin", label: "Gross margin", kind: "pct" },
  { key: "sm", label: "S&M % rev", kind: "pct" },
  { key: "rd", label: "R&D % rev", kind: "pct" },
  { key: "ga", label: "G&A % rev", kind: "pct" },
  { key: "capex", label: "CapEx % rev", kind: "pct" },
  { key: "taxRate", label: "Tax rate", kind: "pct" },
  { key: "interestRate", label: "Interest rate", kind: "pct" },
  { key: "dso", label: "DSO (days)", kind: "days" },
  { key: "dio", label: "DIO (days)", kind: "days" },
  { key: "dpo", label: "DPO (days)", kind: "days" },
];

// A driver value is either a constant or a ramped path; ramps display Y1→Y5.
function driverDisplay(raw: number | number[], kind: "pct" | "days"): string {
  const one = (v: number) => (kind === "pct" ? pct(v) : `${v.toFixed(0)}d`);
  if (Array.isArray(raw)) {
    const first = raw[0]!;
    const lastV = raw[raw.length - 1]!;
    return first === lastV ? one(first) : `${one(first)}→${one(lastV)}`;
  }
  return one(raw);
}

export function ThreeStatementModelDemo() {
  const [scenario, setScenario] = useState<Scenario>("base");
  const periods = useMemo(() => buildModel(scenario), [scenario]);
  const drivers = DRIVERS[scenario];
  const cols = periods.length + 1;

  // Worst-case integrity across all visible periods (epsilon-tolerant).
  const maxImbalance = Math.max(...periods.map((p) => Math.abs(balanceCheck(p))));
  const balanced = maxImbalance < 1e-6;
  const last = periods[periods.length - 1]!;

  return (
    <div className="surface p-5 sm:p-6">
      {/* Header: title, illustrative disclaimer, scenario toggle */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-fg">
              Integrated 3-statement model — live recalc
            </span>
            <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
              Illustrative
            </span>
          </div>
          <p className="mt-1 max-w-xl text-xs text-fg-muted">
            Sample figures for a fictional company (Meridian Analytics), $ in millions — not
            MLAI financials. Every projected line is derived from the scenario drivers; cash is
            the cash-flow plug, so the balance sheet ties out by construction.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Scenario"
          className="inline-flex shrink-0 rounded-xl border border-border bg-bg-subtle p-1"
        >
          {SCENARIOS.map((s) => (
            <button
              type="button"
              key={s.id}
              role="radio"
              aria-checked={scenario === s.id}
              onClick={() => setScenario(s.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                scenario === s.id
                  ? "bg-accent/15 text-accent"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={`${last.label} revenue`} value={`$${money(last.revenue)}M`} />
        <Kpi label="EBITDA margin" value={pct(last.ebitda / last.revenue)} />
        <Kpi label={`${last.label} net income`} value={`$${money(last.netIncome)}M`} />
        <Kpi
          label="Balance check"
          value={balanced ? "Balanced" : "Imbalanced"}
          tone={balanced ? "ok" : "bad"}
          icon={balanced ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Scenario assumptions — the inputs everything below is derived from */}
      <div className="mb-5 rounded-xl border border-border bg-bg-subtle p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
          Scenario drivers — inputs <span className="text-fg-subtle">(ramps shown Y1→Y5)</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4 lg:grid-cols-6">
          {DRIVER_VIEW.map((dv) => (
            <div key={dv.key} className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-fg-subtle">{dv.label}</span>
              <span className="font-mono text-xs font-semibold tabular-nums text-fg">
                {driverDisplay(drivers[dv.key], dv.kind)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Statement table */}
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[640px] border-collapse px-5 sm:px-6">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-bg px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-fg-subtle">
                $ millions
              </th>
              {periods.map((p) => (
                <th
                  key={p.label}
                  className={`whitespace-nowrap px-3 py-2 text-right text-xs font-bold ${p.isActual ? "text-accent" : "text-fg"}`}
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Income statement */}
            <SectionRow title="Income Statement" span={cols} />
            <DataRow label="Revenue" periods={periods} get={(p) => p.revenue} />
            <DataRow label="Cost of revenue" periods={periods} get={(p) => -p.cogs} indent />
            <DataRow label="Gross profit" periods={periods} get={(p) => p.grossProfit} style="subtotal" />
            <DataRow label="Gross margin" periods={periods} get={(p) => p.grossProfit / p.revenue} kind="pct" style="muted" indent />
            <DataRow label="Sales & marketing" periods={periods} get={(p) => -p.sm} indent />
            <DataRow label="Research & development" periods={periods} get={(p) => -p.rd} indent />
            <DataRow label="General & administrative" periods={periods} get={(p) => -p.ga} indent />
            <DataRow label="EBITDA" periods={periods} get={(p) => p.ebitda} style="subtotal" />
            <DataRow label="EBITDA margin" periods={periods} get={(p) => p.ebitda / p.revenue} kind="pct" style="muted" indent />
            <DataRow label="Depreciation & amortization" periods={periods} get={(p) => -p.da} indent />
            <DataRow label="EBIT" periods={periods} get={(p) => p.ebit} style="subtotal" />
            <DataRow label="EBIT margin" periods={periods} get={(p) => p.ebit / p.revenue} kind="pct" style="muted" indent />
            <DataRow label="Interest expense" periods={periods} get={(p) => -p.interest} indent />
            <DataRow label="Pre-tax income (EBT)" periods={periods} get={(p) => p.ebt} style="subtotal" />
            <DataRow label="Income taxes" periods={periods} get={(p) => -p.tax} indent />
            <DataRow label="Net income" periods={periods} get={(p) => p.netIncome} style="subtotal" />
            <DataRow label="Net income margin" periods={periods} get={(p) => p.netIncome / p.revenue} kind="pct" style="muted" indent />

            {/* Balance sheet */}
            <SectionRow title="Balance Sheet" span={cols} />
            <DataRow label="Cash & equivalents" periods={periods} get={(p) => p.cash} indent />
            <DataRow label="Accounts receivable" periods={periods} get={(p) => p.ar} indent />
            <DataRow label="Inventory" periods={periods} get={(p) => p.inventory} indent />
            <DataRow label="PP&E, net" periods={periods} get={(p) => p.ppe} indent />
            <DataRow label="Deferred tax asset (NOL)" periods={periods} get={(p) => p.dta} indent />
            <DataRow label="Total assets" periods={periods} get={(p) => p.totalAssets} style="subtotal" />
            <DataRow label="Accounts payable" periods={periods} get={(p) => p.ap} indent />
            <DataRow label="Accrued liabilities" periods={periods} get={(p) => p.accrued} indent />
            <DataRow label="Debt" periods={periods} get={(p) => p.debt} indent />
            <DataRow label="Total liabilities" periods={periods} get={(p) => p.totalLiabilities} style="subtotal" />
            <DataRow label="Common stock & APIC" periods={periods} get={(p) => p.commonStock} indent />
            <DataRow label="Retained earnings" periods={periods} get={(p) => p.retainedEarnings} indent />
            <DataRow label="Total equity" periods={periods} get={(p) => p.totalEquity} style="subtotal" />
            <DataRow label="Check: Assets − Liab − Equity" periods={periods} get={balanceCheck} style="muted" indent />
            <DataRow label="Memo — NOL carryforward" periods={periods} get={(p) => p.nolBalance} style="muted" indent />

            {/* Cash flow */}
            <SectionRow title="Cash Flow Statement" span={cols} />
            <DataRow label="Net income" periods={periods} get={(p) => p.netIncome} indent />
            <DataRow label="(+) D&A" periods={periods} get={(p) => (p.isActual ? null : p.da)} indent />
            <DataRow label="(+) Deferred taxes" periods={periods} get={(p) => p.deferredTax} indent />
            <DataRow label="(−) Δ working capital" periods={periods} get={(p) => (p.cfo === null ? null : p.cfo - p.netIncome - p.da - (p.deferredTax ?? 0))} indent />
            <DataRow label="Cash from operations" periods={periods} get={(p) => p.cfo} style="subtotal" />
            <DataRow label="(−) CapEx" periods={periods} get={(p) => (p.capex === null ? null : -p.capex)} indent />
            <DataRow label="Cash from investing" periods={periods} get={(p) => p.cfi} style="subtotal" />
            <DataRow label="(−) Dividends" periods={periods} get={(p) => (p.dividends === null ? null : -p.dividends)} indent />
            <DataRow label="Cash from financing" periods={periods} get={(p) => p.cff} style="subtotal" />
            <DataRow label="Net change in cash" periods={periods} get={(p) => p.netChangeCash} />
            <DataRow label="Beginning cash" periods={periods} get={(p) => p.beginningCash} indent />
            <DataRow label="Ending cash" periods={periods} get={(p) => (p.netChangeCash === null ? null : p.cash)} style="subtotal" />
            <DataRow label="Check: CF cash − BS cash" periods={periods} get={cashTieCheck} style="muted" indent />

            {/* Credit metrics */}
            <SectionRow title="Credit & Liquidity Metrics" span={cols} />
            <DataRow label="Debt / EBITDA" periods={periods} get={(p) => p.debt / p.ebitda} kind="mult" indent />
            <DataRow label="Net debt / EBITDA" periods={periods} get={(p) => (p.debt - p.cash) / p.ebitda} kind="mult" indent />
            <DataRow label="EBITDA / interest (coverage)" periods={periods} get={(p) => p.ebitda / p.interest} kind="mult" indent />
            <DataRow label="Debt / total capital" periods={periods} get={(p) => p.debt / (p.debt + p.totalEquity)} kind="pct" indent />
            <DataRow label="Debt / equity" periods={periods} get={(p) => p.debt / p.totalEquity} kind="mult" indent />
            <DataRow label="Current ratio" periods={periods} get={(p) => (p.cash + p.ar + p.inventory) / (p.ap + p.accrued)} kind="mult" indent />
            <DataRow label="Quick ratio" periods={periods} get={(p) => (p.cash + p.ar) / (p.ap + p.accrued)} kind="mult" indent />
          </tbody>
        </table>
      </div>

      <p className="mt-4 font-mono text-[11px] text-fg-subtle">
        Δassets = NI + Δpayables + Δaccrued + Δdebt − dividends = Δliabilities + Δequity
        &nbsp;→&nbsp; balance = 0 every period. Loss years bank an NOL + deferred-tax asset
        (post-2017 80% cap); the deferred-tax add-back keeps cash tied.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "bad";
  icon?: ReactNode;
}) {
  const toneCls =
    tone === "ok" ? "text-status-current" : tone === "bad" ? "text-destructive" : "text-fg";
  return (
    <div className="rounded-xl border border-border bg-bg-subtle px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-fg-subtle">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1.5 text-lg font-bold tabular-nums ${toneCls}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}
