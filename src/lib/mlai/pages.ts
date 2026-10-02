/**
 * Page copy ported from mlai views (`apps/mlai/src/views/*`) that had no home in
 * quesar's typed content layer. Routes import it from here rather than
 * inlining it, so the copy stays reviewable in one place.
 *
 * Claim discipline: mlai described WorkOS, Cloud KMS, Cloud Run, MFA and an
 * invite-only beta. Quesar retired all of those (see AGENTS.md), so each
 * block below is rewritten to what this repository actually implements:
 * Better Auth sessions, `src/lib/server/crypto.server.ts` (AES-256-GCM),
 * `admin.server.ts` (allowlist plus a linked Google or Apple account), the database
 * rate limit, and the `src/lib/server/llm` interface. Anything still being
 * built carries `status: "development"` and is rendered with a status badge,
 * never as shipping.
 */
import type { StatusKind } from "@/lib/site-identity";

import { docsMcpTools, docsModuleMap, docsWdbxCapabilities } from "./categories/abi-runtime";
import { wdbxGraphDefaults, wdbxGraphParams } from "./wdbx-facts";

type Status = { status: StatusKind };

/* ------------------------------------------------------------------ Home */

export const homeBoundaries: readonly ({
  title: string;
  body: string;
  accent: "abi" | "abbey" | "wdbx";
} & Status)[] = [
  {
    title: "Account-scoped access",
    body: "Protected console functions use Better Auth sessions and scope per-user records by user id. Admin access requires an allowlisted email and a linked Google or Apple account. Public inquiry and configuration functions have separate controls.",
    accent: "abi",
    status: "current",
  },
  {
    title: "One server-side model interface",
    body: "Website model requests use a server-side interface configured for xAI or Cloudflare AI Gateway to Gemini. Console Chat checks provider availability and a per-user rate limit; the request builder does not automatically add account email. Provider and deployment acceptance require separate evidence.",
    accent: "abbey",
    status: "current",
  },
  {
    title: "Records you control",
    body: "Conversation audits and workspace refresh tokens are sealed with AES-256-GCM under APP_ENCRYPTION_KEY, bound to their owner and purpose. Console Chat requires current audit consent and stores its sealed exchange before returning a reply. Contact inquiry fields are stored separately and are not covered by this application-level sealing.",
    accent: "wdbx",
    status: "current",
  },
];

export const homeRequestPath: readonly ({ n: string; title: string; body: string } & Status)[] = [
  {
    n: "01",
    title: "Authenticate",
    body: "The protected console Chat function requires a Better Auth session and uses that user's id. This requirement does not apply to every public server function.",
    status: "current",
  },
  {
    n: "02",
    title: "Consent",
    body: "Console Chat requires acceptance of the current audit policy before its provider request. Other website features have their own data and permission boundaries.",
    status: "current",
  },
  {
    n: "03",
    title: "Generate",
    body: "Console Chat requires a configured provider and checks a per-user rate limit before generation. The server request does not automatically include account email.",
    status: "current",
  },
  {
    n: "04",
    title: "Encrypt",
    body: "Console Chat refuses without a valid audit-encryption key. Its prompt and reply are sealed with AES-256-GCM, bound to the audit owner.",
    status: "current",
  },
  {
    n: "05",
    title: "Commit",
    body: "Console Chat stores the sealed audit before returning a successful reply. If audit storage fails, the generated reply is withheld.",
    status: "current",
  },
];

export const homeProductBoundary = [
  {
    title: "What it is",
    body: "Quesar's available source surface is the experimental Quasar website builder: a browser client paired to a separately running operator-owned service. Generation uses a configured provider; live provider acceptance remains unverified.",
  },
  {
    title: "Separate acceptance boundaries",
    body: "Builder source does not establish a trained Quesar foundation model, a hosted Abbey product session, compliance certification, or a performance result. The configured website console is a separate model-request path.",
  },
] as const;

export const homeDocsDoors = [
  {
    href: "/docs/getting-started",
    title: "Getting started",
    body: "Console entry, what a scoped evaluation requires, and where setup lives.",
  },
  {
    href: "/security",
    title: "Security & trust",
    body: "Identity, provider boundary, sealing, retention, and disclosure.",
  },
  {
    href: "/docs/architecture",
    title: "Architecture",
    body: "Control-plane framing and the inspectable WDBX substrate: facts, not a scoreboard.",
  },
] as const;

/** WDBX graph defaults; defined in `./wdbx-facts` so the home route can import it alone. */
export { wdbxFacts } from "./wdbx-facts";

/* ----------------------------------------------------------------- About */

export const aboutWhoWeAre = {
  title: "Rooted in research. Driven by reliability.",
  body: "MLAI is founder-led AI engineering work focused on assistant workflows, memory systems, and developer tools. Source references and implementation limits make the current work inspectable; proposed service engagements need project-specific acceptance criteria.",
  identity: [
    "Founder-led AI engineering",
    "ABI runtime source in Rust",
    "WDBX memory and retrieval source",
    "Security assertions tied to implementation scope",
  ],
} as const;

export const aboutMission = {
  title: "Make assistant workflows inspectable.",
  body: "Define the source, data boundary, tool permissions, and release evidence before expanding an assistant workflow. Research and prototypes require separate implementation and operational acceptance.",
  facts: [
    { k: "Service scope", v: "Proposed" },
    { k: "Deployment boundary", v: "Agreed per project" },
    { k: "Evidence", v: "Source and qualification" },
  ],
} as const;

/* ------------------------------------------------------------------ Team */

export const teamIntro = {
  title: "The founder behind MLAI.",
  lede: "Donald Filimon leads MLAI's source work on assistant workflows, memory systems, and developer tools. The experimental Quasar builder, ABI, WDBX, and Abbey have separate implementation and acceptance boundaries.",
  join: {
    title: "Join the mission",
    body: "We're always looking for exceptional minds in neural research and systems safety.",
    href: "mailto:careers@mlai-corp.com",
    label: "careers@mlai-corp.com",
  },
} as const;

/* ------------------------------------------------------------------ Blog */

export const blogRubrics = [
  {
    title: "Architecture memos",
    body: "How the runtime, memory substrate and personas fit together, and the decisions behind each boundary.",
  },
  {
    title: "Safety drills",
    body: "Failure modes worked through in advance: what fails closed, what gets logged, and who reviews it.",
  },
  {
    title: "Operator UX",
    body: "Control surfaces for the people running the system: calm defaults, visible state, and honest status.",
  },
] as const;

/* ------------------------------------------------------------ Benchmarks */

export const benchmarkFraming = [
  {
    title: "Repeatable",
    body: "Figures state workload shape, hardware target, and where the number came from.",
  },
  {
    title: "Operational",
    body: "Metrics are chosen for release decisions, not vanity dashboards.",
  },
  {
    title: "Private-first",
    body: "Benchmark paths support local, VPC, and edge deployment constraints.",
  },
] as const;

/** Structural facts verifiable from the WDBX sources. Not performance figures. */
export const benchmarkArchitecture = [
  { property: "Primary type", value: "Vectors (ℝᵈ)" },
  { property: "Index", value: `${wdbxGraphDefaults.index}; ${wdbxGraphParams}` },
  { property: "Concurrency", value: `${wdbxGraphDefaults.transactions} transactions` },
  { property: "Integrity", value: "Hash-chained blocks" },
  { property: "Active runtime", value: "Rust" },
] as const;

/* ------------------------------------------------------------------ Docs */

export const docsHub = {
  title: "Quesar developer platform",
  lede: "Build private, traceable AI workflows on the ABI runtime: retrieval provenance and hash-chained memory through WDBX, exposed over a local CLI and an MCP server. Policy-gated agents and an evaluation mesh are planned, not shipped.",
  /**
   * ABI/WDBX capability framing. Retrieval provenance and local operation exist
   * in the sibling Rust workspaces; policy gates and the evaluation mesh do not
   * yet, so each item carries its status rather than reading as shipping.
   */
  capabilities: [
    {
      title: "Traceable retrieval",
      body: "Index records with source metadata and inspect weighted backtrace paths and retrieval score components; snapshots and write-ahead recovery give a restore point.",
      status: "partial",
    },
    {
      title: "Agent policy gates",
      body: "Planned: bind tools to explicit permissions, approval thresholds, and review roles before execution reaches production data. Today the MCP server only fails closed on unknown tools.",
      status: "planned",
    },
    {
      title: "Evaluation mesh",
      body: "Planned: regression suites for retrieval faithfulness, prompt-injection resilience, latency, and operator review burden, run as a release gate.",
      status: "planned",
    },
    {
      title: "Private runtime",
      body: "The ABI CLI and MCP server run locally on operator-owned machines. Packaging for cloud, VPC, on-premise, and offline-first deployments is the design, not a shipped installer.",
      status: "partial",
    },
  ] satisfies readonly ({ title: string; body: string } & Status)[],
  runtimeCommands:
    "# Validate the Rust workspace\n./tools/check.sh\n# Build the CLI and MCP server\n./tools/cargo.sh build -p abi-cli -p abi-mcp\n\n# Inspect capabilities and terminal surfaces\n./target/debug/abi backends\n./target/debug/abi dashboard --pane system --once --json\n./target/debug/abi agent tui",
  runtimeSpec: [
    { k: "Runtime", v: "Rust workspace: AI, WDBX, GPU, MCP, terminal" },
    { k: "Configuration", v: "Crate-specific Cargo features" },
    { k: "Capability inspection", v: "abi backends · abi wdbx gpu info" },
  ],
  moduleMap: docsModuleMap,
  designDecisions: [
    {
      title: "Inspectable capabilities",
      body: "Report the selected backend and whether acceleration is active. Capability detection alone is not evidence of accelerated execution.",
    },
    {
      title: "Bounded evidence",
      body: "SEA selects evidence within record, token, cluster, and prompt-byte budgets. Retrieval is distinct from model training.",
    },
    {
      title: "Explicit runtime boundaries",
      body: "Local completion is deterministic persona-template generation. Live HTTP completion requires an explicitly configured provider.",
    },
  ],
  routingSignals: [
    {
      title: "Explicit address",
      body: "A leading Abbey, Aviva, or Abi name selects that profile; mentioning a name later in prose does not.",
    },
    {
      title: "Token-prefix signals",
      body: "Without an explicit address, keyword stems at the start of whitespace-separated tokens adjust an Abbey-favoring prior.",
    },
    {
      title: "Normalized selection",
      body: "The largest normalized weight selects the primary profile. A routing share is not a calibrated confidence in correctness.",
    },
  ],
  abbeyPrinciples: [
    {
      title: "Care first",
      body: "Read the person's goal and state before reaching for the answer; meet them where they are, never condescending.",
    },
    {
      title: "Clarity always",
      body: "Explain the why, not just the what; teach rather than dictate, and keep jargon in service of understanding.",
    },
    {
      title: "Competence throughout",
      body: "Broad technical range, paired with the honesty to name uncertainty and defer to review instead of bluffing.",
    },
  ],
  /** Badged by `CopyGrid`, like the /wdbx capability table. */
  wdbxCapabilities: docsWdbxCapabilities,
  wdbxV2Docs: [
    {
      file: "getting-started.md",
      label: "Getting Started",
      body: "Install, first run, and the snapshot workflow.",
    },
    {
      file: "architecture.md",
      label: "Architecture",
      body: "Personas, pipeline shape, and main modules.",
    },
    {
      file: "persistence.md",
      label: "Persistence",
      body: "Snapshots and SHA-256-linked block-chain memory.",
    },
    {
      file: "acceleration.md",
      label: "Acceleration",
      body: "CPU kernels today; WGSL/WebGPU scaffolding labeled as such.",
    },
    {
      file: "api.md",
      label: "HTTP API",
      body: "Historical status and dashboard routes from the frozen Zig-era snapshot.",
    },
    { file: "cli.md", label: "CLI & TUI", body: "Commands, chat interface, and teaching flow." },
    { file: "protocols.md", label: "Protocols", body: "MCP / LSP / ACP JSON-RPC surfaces." },
    { file: "limitations.md", label: "Limitations", body: "What V2 explicitly does not claim." },
    { file: "index.md", label: "Index", body: "The full documentation map." },
  ],
  mcpSpec: [
    { k: "Transport", v: "JSON-RPC 2.0 over stdio" },
    { k: "Request cap", v: "64 KB" },
    { k: "Loopback HTTP listener", v: "127.0.0.1:8080 (optional)" },
    { k: "Port override", v: "ABI_MCP_HTTP_PORT" },
    { k: "Bearer auth", v: "ABI_MCP_HTTP_TOKEN (optional)" },
    { k: "Session stream", v: "GET /sse: persistent MCP 2024-11-05 HTTP+SSE session" },
    { k: "Message endpoint", v: "POST /message; without a sessionId, one-shot direct reply" },
  ],
  mcpTools: docsMcpTools,
  /** Deployment of this site, from the env table in AGENTS.md. Each missing value is a "not configured" state, never a crash. */
  deploymentSteps: [
    {
      title: "Database",
      body: "Set DATABASE_URL for Postgres. Without it the app runs on in-memory PGLite, and data does not survive a restart or a serverless instance.",
    },
    {
      title: "Encryption key",
      body: "Set APP_ENCRYPTION_KEY (32 bytes, openssl rand -base64 32). Without it, sealed features refuse instead of storing plaintext.",
    },
    {
      title: "Server-only provider keys",
      body: "Set XAI_API_KEY, or the Cloudflare AI Gateway URL, token and id, plus LLM_PROVIDER. Never expose them to browser bundles.",
    },
    {
      title: "Administrators",
      body: "Set ADMIN_EMAILS. Only an allowlisted address with a linked Google or Apple account becomes an admin.",
    },
    {
      title: "Evaluation gates",
      body: "Run evaluation gates before allowing autonomous write actions or external tool calls.",
    },
  ],
  /** What this site exposes today. Surfaces still being built are labeled, not listed as shipping. */
  apiSurfaces: [
    {
      name: "/api/auth/*",
      body: "Better Auth: Google, Apple and X sign-in, passkeys, email and password, session.",
      status: "current",
    },
    {
      name: "askPersona",
      body: "Server function behind the session: one persona reply through the model interface, rate-limited per user.",
      status: "current",
    },
    {
      name: "askDesk",
      body: "Server function behind the session: a desk answer from the catalog and, when configured, the model.",
      status: "current",
    },
    {
      name: "Console notes",
      body: "Per-user field notes on architecture nodes, scoped by user id.",
      status: "current",
    },
    {
      name: "GET /feed.xml",
      body: "RSS 2.0 for lab notes, research publications and releases. Public.",
      status: "current",
    },
    {
      name: "POST /api/telemetry, POST /api/csp-report",
      body: "Operational sinks: allowlisted anonymous page events (rate-limited, size-limited) and browser CSP violation reports (logged, not stored).",
      status: "current",
    },
    {
      name: "GET /api/cron/audits-expire",
      body: "Daily expiry of old chat audits. Requires Authorization: Bearer CRON_SECRET; without the secret it answers 503 and is off.",
      status: "current",
    },
    {
      name: "Consent, audits, admin review",
      body: "Consent-gated chat with sealed audits you can read and delete; admin review with a stated reason.",
      status: "current",
    },
    {
      name: "Workspace connectors, billing, inquiries",
      body: "Drive and SharePoint connectors, profile billing, and the public inquiry form with a rate limit.",
      status: "current",
    },
  ] satisfies readonly ({ name: string; body: string } & Status)[],
} as const;

/* ----------------------------------------------------------------- Links */

export type LinkHubItem = { title: string; body: string; href: string };

/** mlai's link hub. Hrefs go through `AppLink`, which keeps GitHub links on this site's source pages. */
export const linkHub: readonly { kicker: string; title: string; items: readonly LinkHubItem[] }[] =
  [
    {
      kicker: "Source",
      title: "Build from the source",
      items: [
        {
          title: "abi — runtime + WDBX",
          body: "The nightly Rust runtime and weighted-backtrace substrate this site documents: local AI orchestration with inspectable memory. CLI, MCP server, and CI gates live here.",
          href: "https://github.com/donaldfilimon/abi",
        },
        {
          title: "Abbey Bot",
          body: "Intelligence Without Limits, with a claims ledger: a Discord companion for routing, memory, and calm ops help.",
          href: "https://github.com/donaldfilimon/abbey-bot",
        },
        {
          title: "This site's source",
          body: "quesar.cloud: the TanStack Start app serving these pages, content layer and server routes included.",
          href: "https://github.com/donaldfilimon/quesar.cloud",
        },
        {
          title: "Founder on GitHub",
          body: "The wider project family: WDBX implementations, Gama, and the rest of the public footprint.",
          href: "https://github.com/donaldfilimon",
        },
      ],
    },
    {
      kicker: "Read",
      title: "Read and evaluate",
      items: [
        {
          title: "Research archive",
          body: "The WDBX and Sparse Evidence Attention papers, with sources and limitations on the page.",
          href: "/research",
        },
        {
          title: "Developer docs",
          body: "ABI runtime, MCP tools, WDBX retrieval, and the Abbey–Aviva–Abi persona routing contract.",
          href: "/docs",
        },
        {
          title: "Projects",
          body: "ABI, WDBX, Abbey and Gama: what each one is, the scope it claims, and the source it rests on.",
          href: "/projects",
        },
        {
          title: "Benchmarks",
          body: "Configuration facts with operating context. No borrowed numbers.",
          href: "/benchmarks",
        },
        {
          title: "Lab notes",
          body: "Shorter field notes: the hybrid ranker, SEA selection, persona weights, and Abbey in her own voice.",
          href: "/blog",
        },
        {
          title: "RSS feed",
          body: "Lab notes, research publications and releases, newest first.",
          href: "/feed.xml",
        },
        {
          title: "Changelog",
          body: "Release history across the runtime, storage engine, and training stack: milestone markers, evidence-first.",
          href: "/changelog",
        },
        {
          title: "Hosted abi docs",
          body: "The documentation for the abi repository, oriented on this site.",
          href: "https://donaldfilimon.github.io/abi/",
        },
      ],
    },
    {
      kicker: "Explore",
      title: "Explore the product",
      items: [
        {
          title: "ABI Framework",
          body: "Local AI orchestration with inspectable memory: runtime and WDBX on the Abbey/ABI surface.",
          href: "/products/abi",
        },
        {
          title: "Abbey",
          body: "Intelligence Without Limits, with a claims ledger. A companion that will not claim what the ledger cannot prove.",
          href: "/products/abbey",
        },
        {
          title: "Live demo",
          body: "An illustrative browser query model: cosine search, local partition labels, and a hash-chained query log.",
          href: "/demo",
        },
        {
          title: "3-statement model",
          body: "An interactive financial model on illustrative sample data.",
          href: "/financial-model",
        },
        {
          title: "Showcase",
          body: "The cinematic surfaces: film, trailers, explainer, and design lab.",
          href: "/showcase",
        },
        {
          title: "Services",
          body: "Audit, architecture, and deployment engagements for teams shipping governed AI.",
          href: "/services",
        },
      ],
    },
    {
      kicker: "People",
      title: "The person behind it",
      items: [
        {
          title: "Founder profile",
          body: "Donald Filimon: focus areas, signature work, and the engineering philosophy.",
          href: "/team/donald-filimon",
        },
        {
          title: "donaldfilimon.com",
          body: "The founder's personal site.",
          href: "https://donaldfilimon.com",
        },
        {
          title: "On X",
          body: "Updates and engineering notes in shorter form.",
          href: "https://x.com/donaldfilimonx",
        },
      ],
    },
  ];

/* -------------------------------------------------------------- Showcase */

/** Durations read from `src/cinematic/*` (`DURATION` constants) and the design hub's board list on 2026-09-22. */
export const showcaseReels = [
  {
    href: "/showcase/film",
    reel: "01",
    title: "Brand film",
    duration: "69s · six scenes",
    body: "The Quesar story (persona routing, verifiable memory, and governance) hosted by Abbey, Aviva, and Abi with on-device neural narration.",
  },
  {
    href: "/showcase/trailer",
    reel: "02",
    title: "Vision trailer",
    duration: "62s · high-octane cut",
    body: "A faster, sharper cut of the vision: the spectrum identity, the three minds, and the architecture in motion.",
  },
  {
    href: "/showcase/mega",
    reel: "03",
    title: "Mega-trailer",
    duration: "282s · the longest cut",
    body: "Every scene, a camera rig, and a neural background: the full-length cinematic treatment of the platform.",
  },
  {
    href: "/showcase/explainer",
    reel: "04",
    title: "Explainer film",
    duration: "132s · narrated",
    body: "The deep-dive explainer: memory, routing, governance and the north star, narrated by Abbey with captions and a transcript.",
  },
  {
    href: "/showcase/design",
    reel: "05",
    title: "Design lab",
    duration: "8 boards",
    body: "The design-system boards behind the films: brand, system, hero, lab, marketing and console kits, and docs.",
  },
  {
    href: "/showcase/abbey",
    reel: "06",
    title: "MLAI & Abbey",
    duration: "38s · seven cues",
    body: "A monolith gathers and shatters, three minds draw the shards into their own orbits, and they converge on one mark.",
  },
] as const;

export const showcaseProgram = [
  { k: "Rendered rooms", v: "6" },
  { k: "Primary medium", v: "Browser" },
  { k: "Voice model", v: "On-device" },
] as const;

export const showcaseVoice = {
  title: "On-device neural voice",
  body: "Narration is synthesized in your browser by the Kokoro-82M text-to-speech model (WebGPU, falling back to WASM), with each persona in its own voice and prosody. Nothing downloads until you press Play, and the text is never sent to a server. You can watch without the voice, and captions and a transcript carry the words either way.",
  keys: "space play/pause · ←/→ scrub · 0 restart",
} as const;

/* -------------------------------------------------------------- Security */

export const securitySections = [
  {
    title: "Deployment boundary",
    body: "The static preview has no server functions, authentication, or database. The source also supports a configured server deployment. DATABASE_URL selects durable Postgres; without it, in-memory PGLite does not survive a process restart. Rate-limit counters use the database.",
    status: "current",
  },
  {
    title: "Identity, provider, and sealing controls",
    body: "Protected console functions use Better Auth sessions. Supported sign-in methods are offered according to configuration. Admin access requires an allowlisted email plus a linked Google or Apple account. Conversation audits and workspace refresh tokens use AES-256-GCM under APP_ENCRYPTION_KEY with owner and purpose binding; inquiry fields are not covered by that application-level sealing.",
    status: "current",
  },
  {
    title: "Conversation audits and admin review",
    body: "Website model requests from Console Chat, the persona chat, the configured desk, and workspace Ask Abbey require current audit consent and audit encryption. Each successful exchange is sealed and stored before its reply returns. Audits have a 365-day expiry; automatic deletion requires the configured expiry endpoint and scheduler. Owners can list, read, export, and delete their audits. Admin audit review requires the admin decision and a stated reason, with access events recorded.",
    status: "current",
  },
  {
    title: "Responsible disclosure",
    body: "If you discover a vulnerability in Quesar infrastructure, demos, or integration materials, contact security@mlai-corp.com with reproduction details and impact notes.",
    status: "current",
  },
] as const satisfies readonly ({ title: string; body: string } & Status)[];

/* --------------------------------------------------------- Privacy/Terms */

export const LEGAL_UPDATED = "September 22, 2026";

export const privacyPolicy = [
  {
    title: "Data collection",
    body: "The static preview stores browser preferences and local preview data. A configured server can store account data, field notes, chat consent and audits, inquiries, telemetry events, and workspace connection records according to the features used. These records have different storage and retention boundaries.",
  },
  {
    title: "Account and authentication data",
    body: "Protected account features use Better Auth. Supported social methods depend on configured credentials; passkey and email/password paths are defined in source. Server model-request builders do not automatically add your account email; content you submit may still contain identifying information.",
  },
  {
    title: "Model calls",
    body: "Console Chat, persona chat, configured desk requests, and workspace Ask Abbey can send submitted content to xAI or Gemini through Cloudflare AI Gateway, after the shared consent and audit checks. Desk requests include catalog excerpts. Workspace Ask Abbey sends the document title, its first 800 body characters, and your question; editing alone stays in this browser. An unconfigured desk answers from the catalog without a model call or conversation audit. Static preview functions do not call the website model server. The separate local Quasar service uses its own configured Anthropic provider.",
  },
  {
    title: "Security and retention",
    body: "Conversation audits and workspace refresh tokens are sealed with AES-256-GCM and bound to owner and purpose. The four website model surfaces refuse without audit encryption and current consent, and withhold a model reply if its audit cannot be stored. Audits have a 365-day expiry; automatic deletion requires the configured expiry endpoint and scheduler. Owners can inspect, export, and delete their audits. Contact inquiries are separate unsealed application fields.",
  },
  {
    title: "Inquiries, telemetry and connected sources",
    body: "On the static preview, contact requests an email draft and does not confirm delivery. The configured server can store inquiry name, email, project context, and message after its validation and rate-limit checks, with Turnstile when configured. Workspace connections store a sealed refresh token and connected account metadata. Disconnect and expiry behavior depend on the respective configured features.",
  },
  {
    title: "Deleting your account",
    body: "You can delete your account from your profile. That removes the account, its sessions, your field notes, chat consents, encrypted audits and workspace connections, and revokes any Google grant it held. Contact inquiries you sent are kept as business records, with your account detached from them.",
  },
  {
    title: "Contact",
    body: "For privacy requests, security questions, or data-handling reviews, contact privacy@mlai-corp.com or security@mlai-corp.com.",
  },
] as const;

export const termsSections = [
  {
    title: "Acceptable use",
    body: "Users of Quesar, Quesar services, demos, protected surfaces, and research materials must not use them to build malicious automation, evade security controls, conduct unauthorized surveillance, or generate large-scale deception.",
  },
  {
    title: "Account responsibility",
    body: "You are responsible for maintaining the security of your account and for what is done with it. Do not share a session or attempt to bypass a sign-in, admin, or rate-limit boundary.",
  },
  {
    title: "Intellectual property",
    body: "Quesar names, content, code, designs, research materials, and architecture descriptions are protected by applicable intellectual-property law unless a specific license states otherwise.",
  },
  {
    title: "Experimental and preview features",
    body: "Model output can be incomplete or wrong and must not be treated as professional, safety-critical, legal, medical, or financial advice. Do not rely on preview features for production decisions without independent validation and a written deployment review.",
  },
  {
    title: "Conversation audit consent",
    body: "Console Chat, persona chat, configured desk requests, and workspace Ask Abbey require explicit consent to the current displayed audit policy. Consent is checked when a request is admitted. Withdrawal blocks future admissions; it does not cancel requests already admitted or sent, erase existing audits, or reverse provider processing. You may inspect, export, or delete your available audits.",
  },
  {
    title: "Limitation of liability",
    body: "Quesar provides website, research, and preview materials as-is unless a separate contract applies. Customers are responsible for validating outputs, configuring appropriate safeguards, and controlling deployment risk.",
  },
] as const;
