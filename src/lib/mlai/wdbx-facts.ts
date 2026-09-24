/**
 * WDBX graph defaults, verified against `wdbx/crates/abi-wdbx/src/hnsw.rs`
 * (M = 16, EF_CONSTRUCTION = 40, EF_SEARCH = 32) on 2026-09-22. Configuration
 * facts, not recall, QPS or latency claims. The one source for these values:
 * `wdbxFacts` (home, benchmarks), `runtime.memoryModel`, `benchmarkArchitecture`,
 * the docs hub and `wdbxSpecs` (/wdbx, /platform) all render from it.
 *
 * Its own dependency-free module so the home page can import it without
 * pulling in the rest of `pages.ts`.
 */
export const wdbxGraphDefaults = {
  index: "Layered HNSW",
  m: 16,
  efConstruction: 40,
  efSearch: 32,
  transactions: "MVCC",
} as const;

const g = wdbxGraphDefaults;

export const wdbxFacts = [
  { k: "Active implementation", v: "Rust · abi-wdbx" },
  { k: "Index", v: g.index },
  { k: "Graph degree", v: `M = ${g.m}` },
  { k: "Construction breadth", v: `EF_CONSTRUCTION = ${g.efConstruction}` },
  { k: "Search breadth", v: `EF_SEARCH = ${g.efSearch}` },
  { k: "Transactions", v: g.transactions },
] as const;

/** `M=16, ef_construction=40, ef_search=32`, as the benchmarks table prints it. */
export const wdbxGraphParams = `M=${g.m}, ef_construction=${g.efConstruction}, ef_search=${g.efSearch}`;

/** `M=16, EF_CONSTRUCTION=40, EF_SEARCH=32`, the source constant names. */
export const wdbxGraphConstants = `M=${g.m}, EF_CONSTRUCTION=${g.efConstruction}, EF_SEARCH=${g.efSearch}`;
