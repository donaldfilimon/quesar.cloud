/* Quesar docs — sidebar navigation tree. Split out of DocsShell.tsx so that
   module exports only components (fast refresh). */

/** A leaf nav entry: [route id, label]. */
export type TreeLeaf = readonly [string, string];
/** A nav group: [group label, leaves]. */
export type TreeGroup = readonly [string, readonly TreeLeaf[]];

export const TREE: readonly TreeGroup[] = [
  ["Getting started", [["quickstart", "Quickstart"]]],
  [
    "WDBX",
    [
      ["wdbx", "The vector runtime"],
      ["hnsw", "HNSW parameters"],
    ],
  ],
  ["ABI · Personas", [["personas", "Three minds, one system"]]],
];

export const FLAT: readonly TreeLeaf[] = TREE.flatMap(([, items]) => items);
