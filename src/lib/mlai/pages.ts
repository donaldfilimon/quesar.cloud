/**
 * Page copy ported from mlai views (`apps/mlai/src/views/*`) that had no home in
 * quesar's typed content layer. Routes import it from here rather than
 * inlining it, so the copy stays reviewable in one place.
 *
 * Claim discipline: mlai described WorkOS, Cloud KMS, Cloud Run, MFA and an
 * invite-only beta. Quesar retired all of those (see AGENTS.project.md), so each
 * block below is rewritten to what this repository actually implements:
 * Better Auth sessions, `src/lib/server/crypto.server.ts` (AES-256-GCM),
 * `admin.server.ts` (allowlist plus a broker-linked account), the database
 * rate limit, and the `src/lib/server/llm` interface. Anything still being
 * built carries `status: "development"` and is rendered with a status badge,
 * never as shipping.
 */
import type { StatusKind } from "@/lib/content";

type Status = { status: StatusKind };

/* ------------------------------------------------------------------ Home */

export const homeBoundaries: readonly ({ title: string; body: string; accent: "abi" | "abbey" | "wdbx" } & Status)[] = [
  {
    title: "Account-scoped access",
    body: "Sign-in is the Grok broker (Google or X) or email and password, on Better Auth. Every server function runs behind the session middleware and scopes its queries by your user id. Admin rights need an allowlisted email and a broker-linked account; an allowlisted email/password account is refused.",
    accent: "abi",
    status: "current",
  },
  {
    title: "One server-side model interface",
    body: "Model calls go through one server interface: xAI, or Cloudflare AI Gateway to Gemini, chosen by configuration. Provider keys never reach the browser, your account email is not sent, and calls are rate-limited per user. With no provider configured the UI says so instead of inventing a reply.",
    accent: "abbey",
    status: "current",
  },
  {
    title: "Records you control",
    body: "Data at rest is sealed with AES-256-GCM under APP_ENCRYPTION_KEY, bound to its owner and purpose. Without the key the feature refuses rather than storing plaintext. Console chat is consent-gated, and every exchange is stored as a sealed audit you can read, export and delete.",
    accent: "wdbx",
    status: "current",
  },
];

export const homeRequestPath: readonly ({ n: string; title: string; body: string } & Status)[] = [
  { n: "01", title: "Authenticate", body: "A Better Auth session establishes who is asking. No session, no server function.", status: "current" },
  { n: "02", title: "Consent", body: "The current audit policy must be accepted before content leaves the application.", status: "current" },
  { n: "03", title: "Generate", body: "The configured provider answers through the server interface, rate-limited per user. User email is not sent.", status: "current" },
  { n: "04", title: "Encrypt", body: "Prompt and response are sealed with AES-256-GCM, bound to the owner. No key, no seal: the request refuses.", status: "current" },
  { n: "05", title: "Commit", body: "The sealed audit is written before the response returns. Fail closed.", status: "current" },
];

export const homeProductBoundary = [
  {
    title: "What it is",
    body: "A governed generation path: account-scoped sessions, one server-side provider interface, sealed records, and an admin model that needs a broker-verified identity. Surfaces that are still being built say so.",
  },
  {
    title: "What it is not",
    body: "A consumer chatbot, a benchmark scoreboard, or a place for unaudited model output. It does not invent compliance certifications. Lab demos and evidence stay linked, not in the primary marketing path.",
  },
] as const;

export const homeDocsDoors = [
  { href: "/docs/getting-started", title: "Getting started", body: "Console entry, what a scoped evaluation requires, and where setup lives." },
  { href: "/security", title: "Security & trust", body: "Identity, provider boundary, sealing, retention, and disclosure." },
  { href: "/docs/architecture", title: "Architecture", body: "Control-plane framing and the inspectable WDBX substrate: facts, not a scoreboard." },
] as const;

/**
 * WDBX graph defaults, verified against `wdbx/crates/abi-wdbx/src/hnsw.rs`
 * (M = 16, EF_CONSTRUCTION = 40, EF_SEARCH = 32) on 2026-09-22. Configuration
 * facts, not recall, QPS or latency claims.
 */
export const wdbxFacts = [
  { k: "Active implementation", v: "Rust · abi-wdbx" },
  { k: "Index", v: "Layered HNSW" },
  { k: "Graph degree", v: "M = 16" },
  { k: "Construction breadth", v: "EF_CONSTRUCTION = 40" },
  { k: "Search breadth", v: "EF_SEARCH = 32" },
  { k: "Transactions", v: "MVCC" },
] as const;

/* ----------------------------------------------------------------- About */

export const aboutWhoWeAre = {
  title: "Rooted in research. Driven by reliability.",
  body: "MLAI Corporation emerged from the intersection of deep neural research and the critical need for structural AI reliability. We don't just build models; we build the foundational layers that allow models to operate safely in demanding environments.",
  identity: [
    "Established 2024 · Orlando, FL",
    "WDBX weighted-backtrace architecture",
    "Traceable retrieval and agent safety focus",
    "Security claims tied to source",
  ],
} as const;

export const aboutMission = {
  title: "Ensuring the safety of autonomous progress.",
  body: "As AI systems transition from generative tools to autonomous agents, the margin for error disappears. Our mission is to provide the structural integrity required for this transition: the guardrails, backtrace engines, and orchestration layers that make autonomous intelligence a force for positive, predictable change.",
  facts: [
    { k: "Founded", v: "2024" },
    { k: "Private-first patterns", v: "Local" },
    { k: "Research network", v: "Global" },
  ],
} as const;

/* ------------------------------------------------------------------ Team */

export const teamIntro = {
  title: "The mind behind Quesar.",
  lede: "Quesar is founder-led today, focused on safe, traceable AI infrastructure, and growing deliberately.",
  join: {
    title: "Join the mission",
    body: "We're always looking for exceptional minds in neural research and systems safety.",
    href: "mailto:careers@mlai-corp.com",
    label: "careers@mlai-corp.com",
  },
} as const;

/* ------------------------------------------------------------------ Blog */

export const blogRubrics = [
  { title: "Architecture memos", body: "Practical context, patterns, and decision notes for production-minded AI teams." },
  { title: "Safety drills", body: "Practical context, patterns, and decision notes for production-minded AI teams." },
  { title: "Operator UX", body: "Practical context, patterns, and decision notes for production-minded AI teams." },
] as const;

/* ------------------------------------------------------------ Benchmarks */

export const benchmarkFraming = [
  { title: "Repeatable", body: "Figures state workload shape, hardware target, and where the number came from." },
  { title: "Operational", body: "Metrics are chosen for release decisions, not vanity dashboards." },
  { title: "Private-first", body: "Benchmark paths support local, VPC, and edge deployment constraints." },
] as const;

/** Structural facts verifiable from the WDBX sources. Not performance figures. */
export const benchmarkArchitecture = [
  { property: "Primary type", value: "Vectors (ℝᵈ)" },
  { property: "Index", value: "Layered HNSW; M=16, ef_construction=40, ef_search=32" },
  { property: "Concurrency", value: "MVCC transactions" },
  { property: "Integrity", value: "Hash-chained blocks" },
  { property: "Active runtime", value: "Rust" },
] as const;

/* ------------------------------------------------------------------ Docs */

export const docsHub = {
  title: "Quesar developer platform",
  lede: "Build private, traceable AI workflows on the ABI runtime: retrieval provenance through WDBX, policy-gated agents, evaluation suites, and operator-ready audit trails, exposed over a local CLI and an MCP server.",
  capabilities: [
    { title: "Traceable retrieval", body: "Index records with source metadata, confidence signals, and weighted backtrace paths so every claim has provenance and a rollback point." },
    { title: "Agent policy gates", body: "Bind tools to explicit permissions, approval thresholds, and review roles before execution reaches production data." },
    { title: "Evaluation mesh", body: "Run regression suites for retrieval faithfulness, prompt-injection resilience, latency, and operator review burden as a release gate." },
    { title: "Private runtime", body: "Package orchestration, retrieval, audit logs, and controls for cloud, VPC, on-premise, and offline-first deployments." },
  ],
  runtimeCommands:
    "# Validate the Rust workspace\n./tools/check.sh\n# Build the CLI and MCP server\n./tools/cargo.sh build -p abi-cli -p abi-mcp\n\n# Inspect capabilities and terminal surfaces\n./target/debug/abi backends\n./target/debug/abi dashboard --pane system --once --json\n./target/debug/abi agent tui",
  runtimeSpec: [
    { k: "Runtime", v: "Rust workspace: AI, WDBX, GPU, MCP, terminal" },
    { k: "Configuration", v: "Crate-specific Cargo features" },
    { k: "Capability inspection", v: "abi backends · abi wdbx gpu info" },
  ],
  moduleMap: [
    { name: "abi-ai", body: "Profile routing, completion, and governance helpers." },
    { name: "abi-sea", body: "Evidence selection, scoring, and learning loop." },
    { name: "abi-wdbx", body: "Durable memory and retrieval from the sibling Rust substrate." },
    { name: "abi-gpu", body: "Backend reporting, optional Metal DOT kernels, and CPU fallback." },
    { name: "abi-mcp", body: "JSON-RPC tool handlers and stdio server." },
    { name: "abi-cli", body: "Commands, agent REPL, and diagnostics dashboard." },
  ],
  designDecisions: [
    { title: "Inspectable capabilities", body: "Report the selected backend and whether acceleration is active. Capability detection alone is not evidence of accelerated execution." },
    { title: "Bounded evidence", body: "SEA selects evidence within record, token, cluster, and prompt-byte budgets. Retrieval is distinct from model training." },
    { title: "Explicit runtime boundaries", body: "Local completion is deterministic persona-template generation. Live HTTP completion requires an explicitly configured provider." },
  ],
  routingSignals: [
    { title: "Explicit address", body: "A leading Abbey, Aviva, or Abi name selects that profile; mentioning a name later in prose does not." },
    { title: "Token-prefix signals", body: "Without an explicit address, keyword stems at the start of whitespace-separated tokens adjust an Abbey-favoring prior." },
    { title: "Normalized selection", body: "The largest normalized weight selects the primary profile. A routing share is not a calibrated confidence in correctness." },
  ],
  abbeyPrinciples: [
    { title: "Care first", body: "Read the person's goal and state before reaching for the answer; meet them where they are, never condescending." },
    { title: "Clarity always", body: "Explain the why, not just the what; teach rather than dictate, and keep jargon in service of understanding." },
    { title: "Competence throughout", body: "Broad technical range, paired with the honesty to name uncertainty and defer to review instead of bluffing." },
  ],
  wdbxCapabilities: [
    { title: "Weighted backtrace paths", body: "Inspect which sources were used and where confidence dropped." },
    { title: "SIMD vector search", body: "Cosine nearest-neighbor through the active Rust substrate's layered HNSW index (M=16, EF_CONSTRUCTION=40, EF_SEARCH=32)." },
    { title: "Durable snapshots", body: "JSONL serialize/restore with integrity checks and tamper rejection." },
    { title: "Opt-in persistence", body: "Completions persist only when store_result is set on the request." },
  ],
  wdbxV2Docs: [
    { file: "getting-started.md", label: "Getting Started", body: "Install, first run, and the snapshot workflow." },
    { file: "architecture.md", label: "Architecture", body: "Personas, pipeline shape, and main modules." },
    { file: "persistence.md", label: "Persistence", body: "Snapshots and SHA-256-linked block-chain memory." },
    { file: "acceleration.md", label: "Acceleration", body: "CPU kernels today; WGSL/WebGPU scaffolding labeled as such." },
    { file: "api.md", label: "HTTP API", body: "Historical status and dashboard routes from the frozen Zig-era snapshot." },
    { file: "cli.md", label: "CLI & TUI", body: "Commands, chat interface, and teaching flow." },
    { file: "protocols.md", label: "Protocols", body: "MCP / LSP / ACP JSON-RPC surfaces." },
    { file: "limitations.md", label: "Limitations", body: "What V2 explicitly does not claim." },
    { file: "index.md", label: "Index", body: "The full documentation map." },
  ],
  mcpSpec: [
    { k: "Transport", v: "JSON-RPC 2.0 over stdio" },
    { k: "Request cap", v: "64 KB" },
    { k: "Loopback HTTP listener", v: "127.0.0.1:8080" },
    { k: "Port override", v: "ABI_MCP_HTTP_PORT" },
    { k: "Discovery only", v: "GET /sse (one event, then close)" },
    { k: "Message endpoint", v: "POST /message" },
  ],
  mcpTools: [
    { name: "ai_learn", body: "Evidence-augmented completion with bounded evidence selection." },
    { name: "scheduler_info", body: "Compatibility alias for scheduler statistics." },
    { name: "ai_complete", body: "Run a single completion through the selected persona profile." },
    { name: "ai_run", body: "Run completion with local profile routing." },
    { name: "ai_train", body: "Train the selected local profile against WDBX." },
    { name: "wdbx_query", body: "Vector / block retrieval against the WDBX store with ordered results." },
    { name: "wdbx_stats", body: "Report store size, index health, and snapshot metadata." },
    { name: "gpu_status", body: "Report GPU capability and backend, with deterministic CPU fallback." },
    { name: "scheduler_stats", body: "Report scheduler task counts." },
    { name: "connector_test", body: "Run local connector validation; does not prove live credentials work." },
    { name: "plugin_list", body: "Enumerate registered plugins and their target features." },
    { name: "plugin_run", body: "Invoke a registered plugin entry point." },
  ],
  /** Deployment of this site, from the env table in AGENTS.project.md. Each missing value is a "not configured" state, never a crash. */
  deploymentSteps: [
    { title: "Database", body: "Set DATABASE_URL for Postgres. Without it the app runs on in-memory PGLite, and data does not survive a restart or a serverless instance." },
    { title: "Encryption key", body: "Set APP_ENCRYPTION_KEY (32 bytes, openssl rand -base64 32). Without it, sealed features refuse instead of storing plaintext." },
    { title: "Server-only provider keys", body: "Set XAI_API_KEY, or the Cloudflare AI Gateway URL, token and id, plus LLM_PROVIDER. Never expose them to browser bundles." },
    { title: "Administrators", body: "Set ADMIN_EMAILS. Only an allowlisted address with a broker-linked account (Google or X) becomes an admin." },
    { title: "Evaluation gates", body: "Run evaluation gates before allowing autonomous write actions or external tool calls." },
  ],
  /** What this site exposes today. Surfaces still being built are labeled, not listed as shipping. */
  apiSurfaces: [
    { name: "/api/auth/*", body: "Better Auth: broker sign-in (Google, X), email and password, session.", status: "current" },
    { name: "askPersona", body: "Server function behind the session: one persona reply through the model interface, rate-limited per user.", status: "current" },
    { name: "askDesk", body: "Server function behind the session: a desk answer from the catalog and, when configured, the model.", status: "current" },
    { name: "Console notes", body: "Per-user field notes on architecture nodes, scoped by user id.", status: "current" },
    { name: "GET /feed.xml", body: "RSS 2.0 for lab notes and research publications. Public.", status: "current" },
    { name: "Consent, audits, admin review", body: "Consent-gated chat with sealed audits you can read and delete; admin review with a stated reason.", status: "current" },
    { name: "Workspace connectors, billing, inquiries", body: "Drive and SharePoint connectors, profile billing, and the public inquiry form with a rate limit.", status: "current" },
  ] satisfies readonly ({ name: string; body: string } & Status)[],
} as const;

/* ----------------------------------------------------------------- Links */

export type LinkHubItem = { title: string; body: string; href: string };

/** mlai's link hub. Hrefs go through `AppLink`, which keeps GitHub links on this site's source pages. */
export const linkHub: readonly { kicker: string; title: string; items: readonly LinkHubItem[] }[] = [
  {
    kicker: "Source",
    title: "Build from the source",
    items: [
      { title: "abi — runtime + WDBX", body: "The nightly Rust runtime and weighted-backtrace substrate this site documents: local AI orchestration with inspectable memory. CLI, MCP server, and CI gates live here.", href: "https://github.com/donaldfilimon/abi" },
      { title: "Abbey Bot", body: "Intelligence Without Limits, with a claims ledger: a Discord companion for routing, memory, and calm ops help.", href: "https://github.com/donaldfilimon/abbey-bot" },
      { title: "This site's source", body: "quesar.cloud: the TanStack Start app serving these pages, content layer and server routes included.", href: "https://github.com/donaldfilimon/quesar.cloud" },
      { title: "Founder on GitHub", body: "The wider project family: WDBX implementations, Gama, and the rest of the public footprint.", href: "https://github.com/donaldfilimon" },
    ],
  },
  {
    kicker: "Read",
    title: "Read and evaluate",
    items: [
      { title: "Research archive", body: "The WDBX and Sparse Evidence Attention papers, with sources and limitations on the page.", href: "/research" },
      { title: "Developer docs", body: "ABI runtime, MCP tools, WDBX retrieval, and the Abbey–Aviva–Abi persona routing contract.", href: "/docs" },
      { title: "Projects", body: "ABI, WDBX, Abbey and Gama: what each one is, the scope it claims, and the source it rests on.", href: "/projects" },
      { title: "Benchmarks", body: "Configuration facts with operating context. No borrowed numbers.", href: "/benchmarks" },
      { title: "Lab notes", body: "Shorter field notes: the hybrid ranker, SEA selection, persona weights, and Abbey in her own voice.", href: "/blog" },
      { title: "RSS feed", body: "Lab notes and research publications, newest first.", href: "/feed.xml" },
      { title: "Changelog", body: "Release history across the runtime, storage engine, and training stack: milestone markers, evidence-first.", href: "/changelog" },
      { title: "Hosted abi docs", body: "The documentation for the abi repository, oriented on this site.", href: "https://donaldfilimon.github.io/abi/" },
    ],
  },
  {
    kicker: "Explore",
    title: "Explore the product",
    items: [
      { title: "ABI Framework", body: "Local AI orchestration with inspectable memory: runtime and WDBX on the Abbey/ABI surface.", href: "/products/abi" },
      { title: "Abbey", body: "Intelligence Without Limits, with a claims ledger. A companion that will not claim what the ledger cannot prove.", href: "/products/abbey" },
      { title: "Live demo", body: "An illustrative browser query model: cosine search, local partition labels, and a hash-chained query log.", href: "/demo" },
      { title: "3-statement model", body: "An interactive financial model on illustrative sample data.", href: "/financial-model" },
      { title: "Showcase", body: "The cinematic surfaces: film, trailers, explainer, and design lab.", href: "/showcase" },
      { title: "Services", body: "Audit, architecture, and deployment engagements for teams shipping governed AI.", href: "/services" },
    ],
  },
  {
    kicker: "People",
    title: "The person behind it",
    items: [
      { title: "Founder profile", body: "Donald Filimon: focus areas, signature work, and the engineering philosophy.", href: "/team/donald-filimon" },
      { title: "donaldfilimon.com", body: "The founder's personal site.", href: "https://donaldfilimon.com" },
      { title: "On X", body: "Updates and engineering notes in shorter form.", href: "https://x.com/donaldfilimonx" },
    ],
  },
];

/* -------------------------------------------------------------- Showcase */

/** Durations read from `src/cinematic/*` (`DURATION` constants) and the design hub's board list on 2026-09-22. */
export const showcaseReels = [
  { href: "/showcase/film", reel: "01", title: "Brand film", duration: "69s · six scenes", body: "The Quesar story (persona routing, verifiable memory, and governance) hosted by Abbey, Aviva, and Abi with on-device neural narration." },
  { href: "/showcase/trailer", reel: "02", title: "Vision trailer", duration: "62s · high-octane cut", body: "A faster, sharper cut of the vision: the spectrum identity, the three minds, and the architecture in motion." },
  { href: "/showcase/mega", reel: "03", title: "Mega-trailer", duration: "282s · the longest cut", body: "Every scene, a camera rig, and a neural background: the full-length cinematic treatment of the platform." },
  { href: "/showcase/explainer", reel: "04", title: "Explainer film", duration: "132s · narrated", body: "The deep-dive explainer: storage, routing, math, and the north star, with captions synced to the voices." },
  { href: "/showcase/design", reel: "05", title: "Design lab", duration: "8 boards", body: "The design-system boards behind the films: brand, system, hero, lab, marketing and console kits, and docs." },
  { href: "/showcase/abbey", reel: "06", title: "MLAI & Abbey", duration: "38s · seven cues", body: "A monolith gathers and shatters, three minds draw the shards into their own orbits, and they converge on one mark." },
] as const;

export const showcaseProgram = [
  { k: "Rendered rooms", v: "6" },
  { k: "Primary medium", v: "Browser" },
  { k: "Voice model", v: "On-device" },
] as const;

export const showcaseVoice = {
  title: "On-device neural voice",
  body: "Narration is synthesized in your browser by the Kokoro-82M text-to-speech model (WebGPU, falling back to WASM), with each persona in its own voice and prosody. The model downloads on first playback; the text is never sent to a server. If your browser can't run it, captions carry the words.",
  keys: "space play/pause · ←/→ scrub · 0 restart",
} as const;

/* -------------------------------------------------------------- Security */

export const securitySections = [
  {
    title: "Deployment boundary",
    body: "The site runs on Vercel as serverless functions with no filesystem writes at runtime. Durable data lives in Postgres at DATABASE_URL; without it the app falls back to in-memory PGLite, which does not survive a restart. Rate limits are stored in the database, because serverless instances share no memory.",
    status: "current",
  },
  {
    title: "Identity, provider, and sealing controls",
    body: "Sessions are Better Auth. Sign-in is limited to the Grok broker (Google, X) and email and password. Admin rights require an allowlisted email plus a broker-linked account, and an allowlisted email/password account is refused. Model calls cross one server-side interface that never sends your account email. Data at rest is sealed with AES-256-GCM under APP_ENCRYPTION_KEY, and without the key sealed features refuse. These are implemented controls, not a certification claim.",
    status: "current",
  },
  {
    title: "Conversation audits and admin review",
    body: "Console chat requires consent to the current audit policy. Each exchange is sealed with AES-256-GCM, bound to its owner, before the reply returns, and kept for 365 days. You can list, read, export and delete your own audits. Admin decryption requires an allowlisted, broker-verified identity and a stated reason, and every access is logged.",
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
    body: "This site collects what it needs to operate: a theme preference in your browser, and, if you sign in, your account (name, email, sessions) and the field notes you write in the console. Rate-limit counters key on your user id or on a keyed hash of your IP address; the raw IP is not stored.",
  },
  {
    title: "Account and authentication data",
    body: "Authentication is Better Auth, through the Grok broker (Google or X) or email and password. Session tokens stay server-side in an HttpOnly cookie. Your account email is not sent to a model provider.",
  },
  {
    title: "Model calls",
    body: "When you are signed in and a provider is configured, persona replies and desk questions are sent to that provider (xAI, or Gemini through Cloudflare AI Gateway) to be answered. They are processed under the provider's own terms. With no provider configured, nothing is sent and the page says the model is not configured.",
  },
  {
    title: "Security and retention",
    body: "Data at rest that needs protection is sealed with AES-256-GCM under a server key and bound to its owner. Without the key those features refuse rather than store plaintext. Console chat is used only after you accept the current audit policy. Each exchange is stored as a sealed audit for 365 days, then deleted by a scheduled job. You can list, read, export and delete your own audits at any time. Administrators can open an audit only with a stated reason, and every access is logged.",
  },
  {
    title: "Inquiries, telemetry and connected sources",
    body: "The contact form stores your name, email, and message so we can reply; it is rate-limited, and may use a Cloudflare Turnstile check. Page telemetry records only an event name and a known route path, with no user id or IP address, and is skipped when your browser sends Do Not Track or Global Privacy Control. If you connect Google Drive or Microsoft SharePoint, only a sealed refresh token and the connected account email are stored, with read-only metadata access; disconnecting deletes them.",
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
    body: "Console chat requires explicit consent to the displayed one-year encrypted-audit policy. You may withdraw consent for future chats, and you may inspect, export, or delete your live records. Withdrawal does not retroactively erase records you have not deleted, or provider processing already completed.",
  },
  {
    title: "Limitation of liability",
    body: "Quesar provides website, research, and preview materials as-is unless a separate contract applies. Customers are responsible for validating outputs, configuring appropriate safeguards, and controlling deployment risk.",
  },
] as const;
