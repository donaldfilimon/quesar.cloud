import type { StatusKind } from "./site-identity";

/** The supplied brand vision, qualified by the source-backed product catalog. */
export const homeVision = {
  hero: {
    title: "Human imagination.",
    emphasis: "Adaptive intelligence.",
    lede: "Build assistant workflows, memory systems, and developer tools around inspectable context. Explore the architecture, follow the source, and define the evidence your project needs.",
  },
  belief: {
    title: "AI should amplify human creativity.",
    body: "Our direction is to help people learn, build, reason, and create while keeping human agency at the center.",
  },
  sources: [
    {
      label: "ABI persona contracts",
      href: "https://github.com/donaldfilimon/abi/blob/80dfe079ebe7413a6815c2d564be1f0aaa901267/crates/abi-ai/src/identity.rs",
    },
    {
      label: "ABI setup and limits",
      href: "https://github.com/donaldfilimon/abi/blob/80dfe079ebe7413a6815c2d564be1f0aaa901267/README.md",
    },
    {
      label: "WDBX implementation",
      href: "https://github.com/donaldfilimon/wdbx/blob/e45410356ceb4e96f0dc26a83b02e1c18cf94860/README.md",
    },
    {
      label: "NYON source",
      href: "https://github.com/donaldfilimon/NYON/blob/c3055747ce9d0352b2d1924a0a14eb12e930af43/README.md",
    },
  ],
  ecosystem: [
    {
      name: "Abbey",
      role: "Human-facing companion",
      body: "Designed for thoughtful teaching, creative work, and technical collaboration.",
      boundary: "A persona contract; assistant behavior depends on the configured backend.",
      href: "/abbey",
      status: "current",
      tone: "abbey",
    },
    {
      name: "Aviva",
      role: "Direct expert mode",
      body: "A response mode for concise, candid technical answers, concrete next actions, and explicit uncertainty.",
      boundary: "A local persona profile; the role does not establish model quality.",
      href: "/abi",
      status: "current",
      tone: "aviva",
    },
    {
      name: "Abi",
      role: "Coordination layer",
      body: "Evaluates intent, risk, context, and response style to select a persona or controlled blend.",
      boundary: "Local routing and scheduler helpers; broader governance remains partial.",
      href: "/abi",
      status: "partial",
      tone: "abi",
    },
    {
      name: "WDBX",
      role: "Memory with provenance",
      body: "Local Rust storage and retrieval components preserve durable records, vectors, and causal history.",
      boundary:
        "Storage integrity does not make a statement true; production multi-host deployment is not established.",
      href: "/wdbx",
      status: "current",
      tone: "wdbx",
    },
  ] satisfies readonly {
    name: string;
    role: string;
    body: string;
    boundary: string;
    href: string;
    status: StatusKind;
    tone: "abbey" | "aviva" | "abi" | "wdbx";
  }[],
  developer: {
    title: "Start with the source.",
    body: "Explore ABI’s Rust framework, local CLI, and MCP contracts. Follow the setup and verification guidance before connecting models, tools, or memory.",
    availability:
      "Local framework and contracts. Hosted Quesar APIs and platform SDKs are not published.",
    code: './tools/cargo.sh build -p abi-cli\n./target/debug/abi agent plan "stage a safe WDBX refactor"',
  },
  spatial: {
    title: "NYON: deterministic worlds",
    body: "A Rust strategy game with a separate offline Galaxy Workshop sandbox.",
    boundary:
      "Workshop development and desktop/browser qualification remain in progress. NYON is a related source project.",
  },
  research: {
    title: "Explore the ideas. Inspect the evidence.",
    body: "Read source-backed work on memory, retrieval, model orchestration, and provenance, with implementation status beside the research.",
  },
  community: {
    title: "Build in the open.",
    body: "Explore public repositories, documentation, and plugins. Follow the source and contribute through each project’s own workflow.",
  },
  roadmap: [
    {
      title: "MLAI Studio",
      body: "A proposed workspace for visual agent design, prompt experiments, and inspecting context, memory, and execution.",
    },
    {
      title: "Multimodal collaboration",
      body: "A direction for working across text, images, audio, code, and spatial environments with explicit data boundaries.",
    },
    {
      title: "MLAI Network",
      body: "A proposed community where builders share agents, plugins, research, projects, and extensions.",
    },
  ],
} as const;
