/** Abbey's CLI commands and its claims and workflow ledgers, as reported from the public tree (/abbey). */

export const abbeyCommands = [
  { cmd: "abbey claims", note: "Print the claims ledger. This is the source of status language." },
  { cmd: "abbey memory search", note: "Search local memory. Default store is SQLite." },
  { cmd: "abbey persona", note: "Show the active persona and the last routing reason." },
  { cmd: "abbey workflow", note: "Executable workflow ledger: goals, done, open, blocked." },
] as const;

export const abbeyLedger = {
  current: 18,
  partial: 11,
  proposed: 9,
  blocked: 4,
  outOfScope: 7,
  source: "abbey/src/claims.rs",
  schema: "claims-v1",
  digest: "reported from public tree — re-hash locally before citing",
  toolchain: "Rust nightly via repo wrappers",
  backends: ["SQLite (default)", "WDBX (opt-in feature flag)"],
} as const;

export const abbeyWorkflow = {
  goals: 12,
  done: 6,
  checked: 14,
  open: 8,
  inProgress: 3,
  proposed: 5,
  blocked: 2,
  source: "abbey workflow ledger",
} as const;
