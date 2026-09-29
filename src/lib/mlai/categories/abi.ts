import type { StatusKind } from "@/lib/site-identity";

/** ABI's duties with their status, and what the runtime does not claim (/abi). */

export const abiDuties: { title: string; body: string; status: StatusKind }[] = [
  {
    title: "Model routing",
    body: "Exact registry model IDs and explicit device choice. Optional live providers behind stored credentials.",
    status: "partial",
  },
  {
    title: "Context management",
    body: "Inspectable request context before a model or tool runs. Persistence records vectors and metadata only when the write succeeds.",
    status: "current",
  },
  {
    title: "Safety boundaries",
    body: "Claim-honest reporting, plugin parity guards, bounded workers with finite leases and replay resistance (contracts).",
    status: "partial",
  },
  {
    title: "Tool orchestration",
    body: "Twelve MCP tools in the public tree over stdio, plus an optional loopback HTTP+SSE listener. Not Streamable HTTP.",
    status: "current",
  },
  {
    title: "Reasoning coordination",
    body: "Scheduler-backed helpers with live task and memory observability where the tree implements them.",
    status: "partial",
  },
  {
    title: "Memory integration",
    body: "WDBX is a required sibling. Skipping persistence never fabricates a successful write.",
    status: "current",
  },
];

export const abiNotClaimed = [
  "A current Zig public tree",
  "Distributed production sharding",
  "AES/RBAC as a complete product",
  "Python/TensorFlow stacks",
  "Kubernetes or H100 deployments",
  "QPS, latency, or accuracy numbers",
  "Energy-efficiency comparisons",
  "Browser autonomy",
] as const;
