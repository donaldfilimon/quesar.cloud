import type { StatusKind } from "@/lib/site-identity";

/** Client copy stays independent of the catalog so home loads only its own data. */
const sourceRevision = "f3ccc082f72ef868ca3c3a60f332f7efe9cfe492";
const source = (path: string) =>
  `https://github.com/donaldfilimon/quesar.cloud/blob/${sourceRevision}/${path}`;
const serviceSources = [source("src/lib/mlai/categories/services.ts")] as const;

type ClientLink = Readonly<{ label: string; href: string }>;
type ClientIntro = Readonly<{
  eyebrow: string;
  title: string;
  lede: string;
  availability: string;
  sources: readonly string[];
}>;
type ClientExperience = Readonly<{
  hero: Readonly<{
    eyebrow: string;
    title: string;
    lede: string;
    tagline: string;
    primaryCta: ClientLink;
    secondaryCta: ClientLink;
    sources: readonly string[];
  }>;
  engagementPaths: readonly Readonly<{
    id: "assess" | "build" | "harden";
    title: string;
    body: string;
    services: readonly string[];
    href: string;
    status: StatusKind;
    sources: readonly string[];
  }>[];
  evidenceDoors: readonly Readonly<{
    title: string;
    body: string;
    href: string;
    sources: readonly string[];
  }>[];
  engagementProcess: readonly Readonly<{
    title: string;
    body: string;
    sources: readonly string[];
  }>[];
  landingIntros: Readonly<
    Record<"services" | "platform" | "products" | "apps" | "company" | "showcase", ClientIntro>
  >;
}>;

export const clientExperience = {
  hero: {
    eyebrow: "MLAI · AI engineering",
    title: "Make your AI system inspectable.",
    lede: "Plan an engagement around traceable retrieval, bounded agent workflows, and private deployment. Start with the decisions your team needs to make, then define the evidence that would justify a release.",
    tagline: "Private AI operations.",
    primaryCta: { label: "Discuss your project", href: "/contact" },
    secondaryCta: { label: "Explore the platform", href: "/platform" },
    sources: [...serviceSources, source("notes/mlai/brand.md")],
  },
  engagementPaths: [
    {
      id: "assess",
      title: "Assess the system",
      body: "Scope an audit of workflows, data paths, and approval gates. Use workshops and runtime profiling to turn open questions into a risk register, architecture decisions, and an optimization backlog.",
      services: [
        "Autonomy Readiness Audit",
        "Executive & Engineering Workshops",
        "Model & Runtime Optimization",
      ],
      href: "/services",
      status: "planned",
      sources: serviceSources,
    },
    {
      id: "build",
      title: "Build a bounded workflow",
      body: "Scope retrieval architecture, agent roles, and deployment topology. Translate research into an API contract and test plan, with the data boundary and tool permissions defined before implementation.",
      services: [
        "WDBX Retrieval Architecture",
        "Multi-Agent Orchestration",
        "Private AI Deployment",
        "Research Translation",
      ],
      href: "/services",
      status: "planned",
      sources: serviceSources,
    },
    {
      id: "harden",
      title: "Harden the release path",
      body: "Scope policy checks, audit events, red-team scenarios, and regression evaluation. Agree on release gates and a rollback plan before expanding autonomy.",
      services: ["Safety & Compliance Layering", "Continuous Evaluation Systems"],
      href: "/services",
      status: "planned",
      sources: serviceSources,
    },
  ],
  evidenceDoors: [
    {
      title: "Inspect the architecture",
      body: "Read the runtime layers alongside their implementation limits.",
      href: "/architecture",
      sources: [source("src/lib/mlai/categories/platform.ts")],
    },
    {
      title: "Read the source",
      body: "Follow repository links and setup guidance for a technical review.",
      href: "/developers",
      sources: [source("src/routes/developers.tsx")],
    },
    {
      title: "Compare product availability",
      body: "Check each product's setup requirements and stated limitations.",
      href: "/products",
      sources: [source("src/lib/mlai/categories/product-journeys.ts")],
    },
    {
      title: "Open the documentation",
      body: "Start with the guides, then follow the source behind the behavior.",
      href: "/docs",
      sources: [source("src/lib/mlai/categories/docs.ts")],
    },
  ],
  engagementProcess: [
    {
      title: "Audit",
      body: "Proposed first step: inventory workflows, data, tools, and failure modes; agree on the risk register that guides the work.",
      sources: serviceSources,
    },
    {
      title: "Design",
      body: "Define retrieval, permissions, deployment topology, and an evaluation harness for the agreed scope.",
      sources: serviceSources,
    },
    {
      title: "Build",
      body: "Implement against the agreed harness on operator-owned hardware and establish a baseline the team can rerun.",
      sources: serviceSources,
    },
    {
      title: "Harden",
      body: "Plan red-team checks, rollback, observability, and operator training around the release gate.",
      sources: serviceSources,
    },
  ],
  landingIntros: {
    services: {
      eyebrow: "Services",
      title: "Choose the next engineering decision.",
      lede: "Start with assessment, build a bounded workflow, or harden a release path. The service catalog proposes concrete deliverables for retrieval, orchestration, deployment, and evaluation engagements.",
      availability:
        "Engagement scope, deliverables, and acceptance criteria are agreed for each project.",
      sources: serviceSources,
    },
    platform: {
      eyebrow: "Platform",
      title: "Inspect the system behind the offering.",
      lede: "Explore trace, control, evaluation, and runtime capabilities alongside the layers underneath them.",
      availability:
        "The trace and private runtime capabilities are partial; the control plane is in development and the evaluation mesh is planned. Read each status before choosing an integration.",
      sources: [source("src/lib/mlai/categories/platform.ts")],
    },
    products: {
      eyebrow: "Products",
      title: "Find the right integration surface.",
      lede: "Compare ABI, Abbey, WDBX, and Quasar by purpose, setup requirements, and implementation limits.",
      availability:
        "The catalog describes local developer and document-workspace surfaces. Quasar is experimental and requires a separately running local service and provider configuration.",
      sources: [source("src/lib/mlai/categories/product-journeys.ts")],
    },
    apps: {
      eyebrow: "Apps",
      title: "Explore a surface before setting it up.",
      lede: "Use these pages to orient yourself, then follow the setup and availability notes for the app you need.",
      availability:
        "Browser previews and source-based local apps have different requirements. The public website does not provision an Abbey session or a shared product account.",
      sources: [source("src/lib/mlai/categories/product-journeys.ts")],
    },
    company: {
      eyebrow: "Company",
      title: "Engineering with explicit boundaries.",
      lede: "MLAI is led by founder and systems architect Donald Filimon. Explore the engineering principles behind the services and the source behind the products.",
      availability:
        "Discuss a project to define its scope, data boundaries, and evidence requirements.",
      sources: [source("src/lib/mlai/categories/team.ts"), ...serviceSources],
    },
    showcase: {
      eyebrow: "Showcase",
      title: "See the direction. Inspect the evidence.",
      lede: "Explore the films as an orientation to the architecture and product ideas, then follow the documentation and implementation status for technical decisions.",
      availability:
        "The films carry vision and roadmap context; they do not establish benchmarks or shipped capability.",
      sources: [source("AGENTS.md")],
    },
  },
} as const satisfies ClientExperience;
