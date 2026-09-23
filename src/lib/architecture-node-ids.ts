/**
 * The architecture diagram's node ids, on their own so that route search
 * validation (`/architecture?node=`, `/console?node=`), which runs in the main
 * client bundle, does not pull the full node catalog from `@/lib/content` into
 * it. A test keeps this list equal to `architectureNodes`.
 */
export const ARCHITECTURE_NODE_IDS = [
  "user",
  "quesar",
  "abi",
  "tools",
  "router",
  "context",
  "wdbx",
  "memory",
  "embed",
  "provenance",
  "compute",
  "output",
] as const;

export function isArchitectureNodeId(value: unknown): value is (typeof ARCHITECTURE_NODE_IDS)[number] {
  return typeof value === "string" && (ARCHITECTURE_NODE_IDS as readonly string[]).includes(value);
}
