/** The public repositories this site describes, for /source, /developers and search. */

export type RepoKind = "core" | "surface" | "skill" | "related";

export type Repo = {
  owner: string;
  name: string;
  /** Local copy; shown when GitHub has no description or `pinnedSummary` is set. */
  summary: string;
  language: string;
  /** A site route, or an absolute URL that is linked as-is. */
  href: string;
  kind: RepoKind;
  /** Card label that overrides GitHub's own archived flag. */
  badge?: "archived" | "port source";
  /** Prefer `summary` over the live GitHub description. */
  pinnedSummary?: true;
};

export const repos: readonly Repo[] = [
  {
    owner: "donaldfilimon",
    name: "quesar.cloud",
    summary:
      "Current MLAI/Quesar website, public docs, browser previews, and local service clients.",
    language: "TypeScript",
    href: "https://github.com/donaldfilimon/quesar.cloud",
    kind: "core",
    pinnedSummary: true,
  },
  {
    owner: "donaldfilimon",
    name: "abi",
    summary: "Nightly Rust agent runtime. WDBX sibling required.",
    language: "Rust",
    href: "/abi",
    kind: "core",
  },
  {
    owner: "donaldfilimon",
    name: "wdbx",
    summary: "Provenance-aware episodic substrate extracted from abi with history preserved.",
    language: "Rust",
    href: "/wdbx",
    kind: "core",
  },
  {
    owner: "donaldfilimon",
    name: "abbey",
    summary: "CLI/TUI companion that will not claim what the ledger cannot prove.",
    language: "Rust",
    href: "/abbey",
    kind: "core",
  },
  {
    owner: "donaldfilimon",
    name: "abbey-bot",
    summary: "Companion bot surface for Abbey.",
    language: "Rust",
    href: "/abbey-bot",
    kind: "surface",
  },
  {
    owner: "donaldfilimon",
    name: "AbbeyCompanion",
    summary: "Native macOS SwiftUI companion for Abbey Bot.",
    language: "Swift",
    href: "/companion",
    kind: "surface",
  },
  {
    owner: "donaldfilimon",
    name: "mlai-website-app",
    summary: "Public website, Abbey workspace, developer console, customer portal.",
    language: "TypeScript",
    href: "/workspace",
    kind: "surface",
    badge: "archived",
  },
  {
    owner: "donaldfilimon",
    name: "MLAI-CORPORATION-WWW",
    summary: "Former MLAI site; retained as a port source after quesar.cloud superseded it.",
    language: "TypeScript",
    href: "https://github.com/donaldfilimon/MLAI-CORPORATION-WWW",
    kind: "related",
    badge: "port source",
    pinnedSummary: true,
  },
  {
    owner: "donaldfilimon",
    name: "skill-creator",
    summary: "Public agent skill for shipping this site without breaking integrity rules.",
    language: "Markdown",
    href: "/skill-creator",
    kind: "skill",
  },
  {
    owner: "donaldfilimon",
    name: "plugins",
    summary: "abi-mega: skills, assets, and scripts consumed by ABI sync.",
    language: "Python",
    href: "/plugins",
    kind: "skill",
  },
  {
    owner: "donaldfilimon",
    name: "gama",
    summary: "Declarative Swift UI framework. Founder-owned, not a Quesar product.",
    language: "Swift",
    href: "/gama",
    kind: "related",
  },
  {
    owner: "donaldfilimon",
    name: "cell-lang",
    summary: "Systems language: Rust ownership, Swift ergonomics, Zig control, C ABI.",
    language: "Zig",
    href: "/source/cell-lang",
    kind: "related",
  },
  {
    owner: "donaldfilimon",
    name: "cell-machine",
    summary: "Cellular-automaton experiment in Bun and TypeScript.",
    language: "TypeScript",
    href: "/source/cell-machine",
    kind: "related",
  },
  {
    owner: "donaldfilimon",
    name: "NYON",
    summary: "Voxel-world experiment. Not a Quesar product surface.",
    language: "Rust",
    href: "/source/nyon",
    kind: "related",
  },
  {
    owner: "donaldfilimon",
    name: "mlai-site",
    summary: "Earlier marketing site. Current orientation lives here.",
    language: "JavaScript",
    href: "/quesar",
    kind: "surface",
  },
];
