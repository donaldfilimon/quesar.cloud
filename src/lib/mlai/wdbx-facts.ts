/**
 * WDBX graph defaults, verified against `wdbx/crates/abi-wdbx/src/hnsw.rs`
 * (M = 16, EF_CONSTRUCTION = 40, EF_SEARCH = 32) on 2026-09-22. Configuration
 * facts, not recall, QPS or latency claims. Its own module so the home page
 * can import it without pulling in the rest of `pages.ts`.
 */
export const wdbxFacts = [
  { k: "Active implementation", v: "Rust · abi-wdbx" },
  { k: "Index", v: "Layered HNSW" },
  { k: "Graph degree", v: "M = 16" },
  { k: "Construction breadth", v: "EF_CONSTRUCTION = 40" },
  { k: "Search breadth", v: "EF_SEARCH = 32" },
  { k: "Transactions", v: "MVCC" },
] as const;
