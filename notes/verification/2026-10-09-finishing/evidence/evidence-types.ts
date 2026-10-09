// Shapes of the historical JSON receipts consumed by these diagnostic scripts.
export type TreeEntry = { link: string } | { sha256: string; bytes: number };
export type TreeReceipt = { sha256: string; files: Record<string, TreeEntry> };
export type InstalledManifest = { version: string; manifest_sha256: string; realpath: string };
export type SnapshotReceipt = {
  baseline: string;
  source_sha256: string;
  source: Record<string, string>;
  installed: Record<string, InstalledManifest>;
  toolchain: { node: string; bun: string };
  docs: TreeReceipt;
  public: TreeReceipt;
  persistent: TreeReceipt & { root: string };
  native_binary_sha256: string;
};
export type CommandReceipt = {
  exit: number | null;
  passed?: number;
  failed?: number;
  files?: number;
  expectations?: number;
  pages?: number;
  superseded?: string;
  binary?: string;
  native_sha256?: string;
  signal?: string;
  started?: string;
  ended?: string;
  sha256?: string;
  log_sha256?: string;
};
export type RunnerReceipt = {
  name: string;
  path: string;
  started: string;
  ended: string;
  exit: number | null;
  signal: NodeJS.Signals | null;
  error?: string;
};
