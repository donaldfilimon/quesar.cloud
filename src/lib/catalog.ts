import type { StatusKind } from "./content";

export const repoPaths: Record<string, string> = {
  "MLAI-CORPORATION-WWW": "/developers",
  "mlai-corp-website": "/developers",
  abi: "/abi",
  wdbx: "/wdbx",
  abbey: "/abbey",
  "abbey-bot": "/abbey-bot",
  AbbeyBot: "/abbey-bot",
  "skill-creator": "/skill-creator",
  plugins: "/plugins",
  gama: "/gama",
  "mlai-website-app": "/workspace",
  AbbeyCompanion: "/companion",
  "cell-lang": "/source/cell-lang",
  NYON: "/source/nyon",
  "nyon-game": "/source/nyon",
  "wdbx-py": "/source/wdbx-py",
  wdbx_python: "/source/wdbx-py",
  "mlai-site": "/quesar",
  "cell-machine": "/source/cell-machine",
  "mlai-py": "/source/mlai-py",
  HydroCycle: "/source/hydrocycle",
  paint: "/source/paint",
  Invasion3D: "/source/invasion3d",
  wdnx: "/source/wdnx",
  "cell-state-adaptive-bun-validated": "/source/cell-state",
  "alien-invasion": "/source/alien-invasion",
  "star-space-portfolio": "/source/star-space",
  donaldfilimon: "/source/donaldfilimon",
  "donaldfilimon.github.io": "/source/portfolio",
  ovo: "/source/ovo",
  mlaix: "/source/mlaix",
};

export function pathForRepo(name: string) {
  return repoPaths[name] ?? `/source/${encodeURIComponent(name)}`;
}

export const appSurfaces = [
  {
    id: "quasar",
    name: "Quasar",
    path: "/quesar",
    status: "experimental" as StatusKind,
    kicker: "Local builder",
    body: "Prompt to a Next.js project. This page runs a browser studio so you can see the loop without leaving the site.",
  },
  {
    id: "workspace",
    name: "Abbey workspace",
    path: "/workspace",
    status: "current" as StatusKind,
    kicker: "Documents",
    body: "Local document workspace with assistant context. The shipping app runs on your machine; this page is the in-browser orientation of that loop.",
  },
  {
    id: "mobile",
    name: "Mobile companion",
    path: "/mobile",
    status: "partial" as StatusKind,
    kicker: "Vault",
    body: "Expo companion with a private vault. Native CloudKit is a signed iOS build. This page is the web vault.",
  },
  {
    id: "console",
    name: "Field console",
    path: "/console",
    status: "current" as StatusKind,
    kicker: "Notes",
    body: "Signed-in notes on architecture nodes. Not an Abbey session.",
  },
  {
    id: "abbey-bot",
    name: "Abbey bot",
    path: "/abbey-bot",
    status: "partial" as StatusKind,
    kicker: "Companion",
    body: "Companion bot surface for Abbey. Watch Abi route Abbey and Aviva in the browser.",
  },
  {
    id: "companion",
    name: "Abbey Companion",
    path: "/companion",
    status: "partial" as StatusKind,
    kicker: "macOS",
    body: "Native SwiftUI companion for Abbey Bot. Local surface, not a hosted session.",
  },
  {
    id: "skill-creator",
    name: "skill-creator",
    path: "/skill-creator",
    status: "current" as StatusKind,
    kicker: "Integrity",
    body: "Public agent skill for shipping this site without breaking Apple framing, provenance, Apache-2.0, or toolchain facts.",
  },
  {
    id: "gama",
    name: "Gama",
    path: "/gama",
    status: "research" as StatusKind,
    kicker: "Founder",
    body: "Declarative Swift UI framework. Founder-owned. Not a Quesar product claim.",
  },
  {
    id: "plugins",
    name: "Plugins",
    path: "/plugins",
    status: "partial" as StatusKind,
    kicker: "abi-mega",
    body: "Skills, assets, and scripts consumed by ABI sync. Founder tooling, not a hosted marketplace.",
  },
  {
    id: "demo",
    name: "Persona demo",
    path: "/demo",
    status: "experimental" as StatusKind,
    kicker: "Router",
    body: "Type a message and watch Abi score the blend coefficient α. Illustrative heuristic, not a trained classifier.",
  },
  {
    id: "cell-machine",
    name: "Cell machine",
    path: "/cell-machine",
    status: "research" as StatusKind,
    kicker: "Automaton",
    body: "Cellular-automaton experiment. Playable here.",
  },
] as const;

export const frozenCli = [
  "help",
  "complete",
  "train",
  "agent",
  "backends",
  "plugin",
  "auth",
  "twilio",
  "tui",
  "dashboard",
  "wdbx",
  "scheduler",
  "nn",
] as const;

export const repoDocs: Record<
  string,
  {
    title: string;
    lede: string;
    status: StatusKind;
    language: string;
    sections: { title: string; body: string }[];
  }
> = {
  "cell-lang": {
    title: "Cell",
    lede: "Founder systems language: Rust ownership, Swift ergonomics, Zig control, compiled to a C ABI. Not a Quesar product claim.",
    status: "research",
    language: "Zig",
    sections: [
      {
        title: "What it is",
        body: "A Zig-hosted compiler with C, LLVM IR, and MLIR backends. It is founder research, not an MLAI runtime dependency.",
      },
      {
        title: "What it is not",
        body: "Not a Quesar surface, not a replacement for nightly Rust ABI, and not a hosted language service.",
      },
    ],
  },
  nyon: {
    title: "NYON",
    lede: "Founder voxel-world experiment. Not a Quesar product surface.",
    status: "research",
    language: "Rust",
    sections: [
      {
        title: "Boundary",
        body: "NYON is listed because it is public. It does not ship with Quesar, ABI, WDBX, or Abbey.",
      },
    ],
  },
  "wdbx-py": {
    title: "wdbx-py",
    lede: "Earlier Python WDBX implementation. The active substrate is the Rust tree.",
    status: "partial",
    language: "Python",
    sections: [
      {
        title: "Authority",
        body: "Configuration facts and crate maps on this site come from the Rust substrate. Treat wdbx-py as historical.",
      },
    ],
  },
  "cell-machine": {
    title: "cell-machine",
    lede: "Cellular-automaton experiment in Bun and TypeScript. Founder research, not a Quesar product.",
    status: "research",
    language: "TypeScript",
    sections: [
      {
        title: "Boundary",
        body: "Public, inspectable, and unrelated to the Quesar runtime. Play it on this page so the catalog is complete without sending you away.",
      },
    ],
  },
  hydrocycle: {
    title: "HydroCycle",
    lede: "Founder hydrology experiment. Related by author, not a Quesar surface.",
    status: "research",
    language: "TypeScript",
    sections: [{ title: "Boundary", body: "Listed because it is public. Not part of the Quesar stack." }],
  },
  paint: {
    title: "paint",
    lede: "winit + wgpu + kurbo graphics app on Rust nightly.",
    status: "research",
    language: "Rust",
    sections: [{ title: "Boundary", body: "A drawing surface. Not an Abbey canvas and not a hosted editor." }],
  },
  invasion3d: {
    title: "Invasion3D",
    lede: "Metal 4 renderer with SwiftUI and SwiftData. Founder graphics work.",
    status: "research",
    language: "Swift",
    sections: [{ title: "Boundary", body: "Not a Quesar product. Native Apple stack, not this website's runtime." }],
  },
  wdnx: {
    title: "wdnx",
    lede: "Earlier database specification work. Historical relative of WDBX.",
    status: "research",
    language: "Python",
    sections: [{ title: "Authority", body: "The active substrate is donaldfilimon/wdbx in Rust." }],
  },
  "cell-state": {
    title: "cell-state",
    lede: "Cell-state adaptive solver with a WebGPU lab simulation.",
    status: "research",
    language: "TypeScript",
    sections: [{ title: "Boundary", body: "A lab. Not evidence of a Quesar spatial engine." }],
  },
  "alien-invasion": {
    title: "alien-invasion",
    lede: "Real-time WebGL cinematic: seven chapters, one camera move.",
    status: "research",
    language: "TypeScript",
    sections: [{ title: "Boundary", body: "A film experiment. See also /showcase/film." }],
  },
  "star-space": {
    title: "Star Space",
    lede: "Personal portfolio experiment. Not the company site.",
    status: "research",
    language: "TypeScript",
    sections: [{ title: "Boundary", body: "Donald Filimon personal work, not Quesar orientation." }],
  },
  donaldfilimon: {
    title: "donaldfilimon",
    lede: "Profile and miscellaneous public work.",
    status: "research",
    language: "Rust",
    sections: [{ title: "Boundary", body: "Author namespace. Product facts live on the product pages." }],
  },
  portfolio: {
    title: "donaldfilimon.github.io",
    lede: "Personal Next.js static export. Separate from Quesar.",
    status: "research",
    language: "TypeScript",
    sections: [{ title: "Boundary", body: "Personal site. Company orientation is this website." }],
  },
  ovo: {
    title: "ovo",
    lede: "Founder Zig experiment.",
    status: "research",
    language: "Zig",
    sections: [{ title: "Boundary", body: "Not an MLAI runtime dependency." }],
  },
  "mlai-py": {
    title: "mlai-py",
    lede: "Early Python machine-learning library sketch.",
    status: "research",
    language: "Python",
    sections: [{ title: "Boundary", body: "Historical. Current runtimes are Rust." }],
  },
  mlaix: {
    title: "mlaix",
    lede: "Private TypeScript sketch in the MLAI namespace.",
    status: "development",
    language: "TypeScript",
    sections: [{ title: "Boundary", body: "Not a public product surface." }],
  },
};

export const quasarParts = [
  {
    title: "packages/shared",
    body: "TypeScript types and zod schemas shared by the service and the Expo app — Site, GenerationEvent, PreviewStatus, request bodies.",
  },
  {
    title: "sidecars/quasar-service",
    body: "Local Bun service (default port 4700): registry, path guard, site filesystem tools, generation engine, scaffolder, preview manager.",
  },
  {
    title: "templates/next-site",
    body: "A buildable, checked-in Next.js 16 + Tailwind v4 starter, copied per-site as the generation baseline.",
  },
  {
    title: "/quasar screens",
    body: "Sites, new site, site detail with live events and preview, and settings, in this app. They call the local service from your browser. There is no deploy step in v1.",
  },
] as const;
