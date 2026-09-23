/**
 * Interactive 3-statement model — Income Statement, Balance Sheet, and Cash
 * Flow Statement integrated by live derivation, with a Base/Upside/Downside
 * scenario toggle, margin analysis, and credit metrics.
 *
 * ILLUSTRATIVE ONLY. The figures describe a fictional SaaS company ("Meridian
 * Analytics"), not MLAI Corporation. Nothing here is a financial claim about
 * MLAI — it is a demonstration of an integrated financial model rendered in the
 * browser, the same way the WDBX demo is a miniature, "not the engine itself".
 * Ported from mlai `src/components/demos/ThreeStatementModelDemo.tsx` (b6f3686).
 *
 * Formulas over hardcodes: only the historical anchor (FY2024A) and each
 * scenario's assumption drivers are constants. Every projected line — revenue,
 * COGS, working capital, PP&E and retained-earnings roll-forwards, the cash-flow
 * statement, margins, and credit ratios — is *derived*. Flipping the scenario
 * re-derives all three statements. Cash is the balancing plug taken from the
 * cash-flow statement, so Assets = Liabilities + Equity holds by construction.
 */

export type Scenario = "base" | "upside" | "downside";

// Ramped drivers are 5-element paths (FY2025E..FY2029E) so margins/growth can
// evolve over the horizon; the rest are constant across the projection.
export interface Drivers {
  revenueGrowth: number[]; // YoY, per year
  grossMargin: number[]; // gross profit / revenue, per year
  sm: number[]; // S&M as % of revenue, per year
  rd: number[]; // R&D as % of revenue, per year
  ga: number[]; // G&A as % of revenue, per year
  da: number; // D&A as % of revenue
  capex: number; // CapEx as % of revenue
  taxRate: number;
  interestRate: number; // on (flat) debt
  dso: number; // days sales outstanding -> AR
  dio: number; // days inventory outstanding -> Inventory
  dpo: number; // days payable outstanding -> AP
  accruedPctRev: number; // accrued liabilities as % of revenue
  dividendPayout: number; // dividends / net income
}

// Post-2017 U.S. federal limit: an NOL can offset at most 80% of taxable income.
const NOL_LIMIT = 0.8;

// Per-scenario assumption drivers. Hierarchy is intentional and holds per-year:
// Upside > Base > Downside for growth/margins; inverted for cost ratios.
export const DRIVERS: Record<Scenario, Drivers> = {
  // Base — gentle margin expansion, steady growth. Profitable throughout.
  base: {
    revenueGrowth: [0.16, 0.17, 0.18, 0.18, 0.18],
    grossMargin: [0.65, 0.66, 0.66, 0.67, 0.67],
    sm: [0.25, 0.24, 0.24, 0.23, 0.23],
    rd: [0.15, 0.15, 0.15, 0.14, 0.14],
    ga: [0.1, 0.09, 0.09, 0.09, 0.09],
    da: 0.05,
    capex: 0.06,
    taxRate: 0.25,
    interestRate: 0.06,
    dso: 45,
    dio: 30,
    dpo: 35,
    accruedPctRev: 0.05,
    dividendPayout: 0,
  },
  // Upside — faster growth, stronger margin expansion. Profitable throughout.
  upside: {
    revenueGrowth: [0.22, 0.25, 0.27, 0.28, 0.28],
    grossMargin: [0.67, 0.68, 0.69, 0.7, 0.7],
    sm: [0.23, 0.22, 0.21, 0.2, 0.2],
    rd: [0.15, 0.14, 0.14, 0.13, 0.13],
    ga: [0.09, 0.08, 0.08, 0.08, 0.08],
    da: 0.05,
    capex: 0.07,
    taxRate: 0.25,
    interestRate: 0.06,
    dso: 40,
    dio: 28,
    dpo: 40,
    accruedPctRev: 0.05,
    dividendPayout: 0,
  },
  // Downside — a revenue dip + margin compression drives two early loss years
  // (FY2025E–FY2026E) that bank an NOL; the recovery years then utilize it.
  downside: {
    revenueGrowth: [-0.06, 0.02, 0.06, 0.09, 0.1],
    grossMargin: [0.56, 0.58, 0.6, 0.62, 0.63],
    sm: [0.3, 0.28, 0.26, 0.25, 0.24],
    rd: [0.17, 0.16, 0.15, 0.15, 0.15],
    ga: [0.13, 0.12, 0.11, 0.1, 0.1],
    da: 0.05,
    capex: 0.04,
    taxRate: 0.25,
    interestRate: 0.06,
    dso: 55,
    dio: 38,
    dpo: 28,
    accruedPctRev: 0.05,
    dividendPayout: 0,
  },
};

// Historical anchor (FY2024A, $ in millions). These are the only Income/Balance
// constants; AR/Inventory/AP/Accrued derive from the actual ratios below and
// cash is the balancing plug, so the opening balance sheet ties out on its own.
const HIST_ANCHOR = { revenue: 120, ppe: 50, debt: 40, commonStock: 30, retainedEarnings: 25 };
const HIST = {
  grossMargin: 0.65,
  sm: 0.25,
  rd: 0.15,
  ga: 0.1,
  da: 0.05,
  taxRate: 0.25,
  interestRate: 0.06,
  dso: 45,
  dio: 30,
  dpo: 35,
  accruedPctRev: 0.05,
};

const PERIODS = ["FY2024A", "FY2025E", "FY2026E", "FY2027E", "FY2028E", "FY2029E"];

export interface Period {
  label: string;
  isActual: boolean;
  // Income statement
  revenue: number;
  cogs: number;
  grossProfit: number;
  sm: number;
  rd: number;
  ga: number;
  opex: number;
  ebitda: number;
  da: number;
  ebit: number;
  interest: number;
  ebt: number;
  tax: number;
  netIncome: number;
  // NOL / deferred-tax schedule
  nolBalance: number;
  dta: number;
  deferredTax: number | null;
  // Balance sheet
  cash: number;
  ar: number;
  inventory: number;
  ppe: number;
  totalAssets: number;
  ap: number;
  accrued: number;
  debt: number;
  totalLiabilities: number;
  commonStock: number;
  retainedEarnings: number;
  totalEquity: number;
  // Cash flow (null for the actual anchor — no prior period)
  cfo: number | null;
  cfi: number | null;
  cff: number | null;
  capex: number | null;
  dividends: number | null;
  beginningCash: number | null;
  netChangeCash: number | null;
}

export function buildModel(scenario: Scenario): Period[] {
  const d = DRIVERS[scenario];
  const periods: Period[] = [];

  // ---- Historical anchor (FY2024A) ----
  const a = HIST_ANCHOR;
  const h0 = {} as Period;
  h0.label = PERIODS[0]!;
  h0.isActual = true;
  h0.revenue = a.revenue;
  h0.cogs = a.revenue * (1 - HIST.grossMargin);
  h0.grossProfit = h0.revenue - h0.cogs;
  h0.sm = a.revenue * HIST.sm;
  h0.rd = a.revenue * HIST.rd;
  h0.ga = a.revenue * HIST.ga;
  h0.opex = h0.sm + h0.rd + h0.ga;
  h0.ebitda = h0.grossProfit - h0.opex;
  h0.da = a.revenue * HIST.da;
  h0.ebit = h0.ebitda - h0.da;
  h0.interest = a.debt * HIST.interestRate;
  h0.ebt = h0.ebit - h0.interest;
  h0.tax = h0.ebt * HIST.taxRate; // anchor is profitable; no NOL
  h0.netIncome = h0.ebt - h0.tax;
  h0.nolBalance = 0;
  h0.dta = 0;
  h0.deferredTax = null;
  h0.ar = (HIST.dso / 365) * h0.revenue;
  h0.inventory = (HIST.dio / 365) * h0.cogs;
  h0.ppe = a.ppe;
  h0.ap = (HIST.dpo / 365) * h0.cogs;
  h0.accrued = HIST.accruedPctRev * h0.revenue;
  h0.debt = a.debt;
  h0.commonStock = a.commonStock;
  h0.retainedEarnings = a.retainedEarnings;
  h0.totalEquity = h0.commonStock + h0.retainedEarnings;
  h0.totalLiabilities = h0.ap + h0.accrued + h0.debt;
  // Cash is the plug that makes the opening balance sheet balance (DTA = 0 here).
  h0.cash = h0.totalLiabilities + h0.totalEquity - (h0.ar + h0.inventory + h0.ppe + h0.dta);
  h0.totalAssets = h0.cash + h0.ar + h0.inventory + h0.ppe + h0.dta;
  h0.cfo = h0.cfi = h0.cff = h0.capex = h0.dividends = null;
  h0.beginningCash = h0.netChangeCash = null;
  periods.push(h0);

  // ---- Projections (FY2025E .. FY2029E) ----
  let prior = h0;
  for (let i = 1; i < PERIODS.length; i++) {
    const y = i - 1; // index into the 5-element ramped-driver paths
    const p = {} as Period;
    p.label = PERIODS[i]!;
    p.isActual = false;

    // Income statement (ramped drivers vary by year)
    p.revenue = prior.revenue * (1 + d.revenueGrowth[y]!);
    p.cogs = p.revenue * (1 - d.grossMargin[y]!);
    p.grossProfit = p.revenue - p.cogs;
    p.sm = p.revenue * d.sm[y]!;
    p.rd = p.revenue * d.rd[y]!;
    p.ga = p.revenue * d.ga[y]!;
    p.opex = p.sm + p.rd + p.ga;
    p.ebitda = p.grossProfit - p.opex;
    p.da = p.revenue * d.da;
    p.ebit = p.ebitda - p.da;
    p.interest = prior.debt * d.interestRate; // debt held flat -> no circularity
    p.ebt = p.ebit - p.interest;

    // NOL / deferred-tax engine. Book tax = EBT × rate with full DTA
    // recognition (NI = EBT × (1 − rate) every year). A loss banks an NOL and a
    // matching DTA; a profit utilizes the NOL up to 80% of EBT. Cash tax falls
    // below book tax by the deferred portion, which is the CFO add-back below.
    const nolGenerated = p.ebt < 0 ? -p.ebt : 0;
    const nolUtilized = p.ebt > 0 ? Math.min(prior.nolBalance, NOL_LIMIT * p.ebt) : 0;
    p.nolBalance = prior.nolBalance + nolGenerated - nolUtilized;
    p.dta = p.nolBalance * d.taxRate;
    p.tax = p.ebt * d.taxRate; // book tax expense (negative = benefit in loss years)
    const currentTax = p.ebt > 0 ? (p.ebt - nolUtilized) * d.taxRate : 0;
    p.deferredTax = p.tax - currentTax; // non-cash portion (= −ΔDTA exactly)
    p.netIncome = p.ebt - p.tax;

    // Working capital (drives both the balance sheet and CFO deltas)
    p.ar = (d.dso / 365) * p.revenue;
    p.inventory = (d.dio / 365) * p.cogs;
    p.ap = (d.dpo / 365) * p.cogs;
    p.accrued = d.accruedPctRev * p.revenue;
    p.capex = p.revenue * d.capex;

    // Roll-forwards
    p.ppe = prior.ppe + p.capex - p.da; // PP&E: + CapEx − D&A
    p.debt = prior.debt; // flat
    p.commonStock = prior.commonStock;
    p.dividends = p.netIncome > 0 ? p.netIncome * d.dividendPayout : 0;
    p.retainedEarnings = prior.retainedEarnings + p.netIncome - p.dividends;

    // Cash flow statement. Deferred tax is a non-cash add-back: the +ΔDTA on the
    // asset side and the −ΔDTA carried by deferredTax here cancel, so the sheet
    // still balances by construction.
    p.cfo =
      p.netIncome +
      p.da +
      p.deferredTax -
      (p.ar - prior.ar) - // ΔAR increase = use of cash
      (p.inventory - prior.inventory) +
      (p.ap - prior.ap) + // ΔAP increase = source of cash
      (p.accrued - prior.accrued);
    p.cfi = -p.capex;
    p.cff = p.debt - prior.debt - p.dividends; // Δdebt (0) − dividends
    p.netChangeCash = p.cfo + p.cfi + p.cff;
    p.beginningCash = prior.cash;
    p.cash = p.beginningCash + p.netChangeCash; // ending cash feeds the BS

    // Balance sheet totals (DTA included in assets)
    p.totalEquity = p.commonStock + p.retainedEarnings;
    p.totalLiabilities = p.ap + p.accrued + p.debt;
    p.totalAssets = p.cash + p.ar + p.inventory + p.ppe + p.dta;

    periods.push(p);
    prior = p;
  }
  return periods;
}

// ---- Integrity checks (rendered live, must read ~0) ----
export function balanceCheck(p: Period): number {
  return p.totalAssets - p.totalLiabilities - p.totalEquity;
}
export function cashTieCheck(p: Period): number | null {
  // CF ending cash vs BS cash. Equal by construction; surfaced for honesty.
  if (p.netChangeCash === null || p.beginningCash === null) return null;
  return p.beginningCash + p.netChangeCash - p.cash;
}
