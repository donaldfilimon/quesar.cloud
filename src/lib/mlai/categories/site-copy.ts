import type { StatusKind } from "@/lib/site-identity";

/** Shared site copy: integration apps, integrity rules, the FAQ and the static-site field-notes notice. */

/** Shown in place of field-note prompts on the static site, which has no server. */
export const fieldNotesOffline = "Field notes need the server deployment.";

export const integrationApps = [
  {
    path: "src/",
    href: "/",
    purpose:
      "The one app: TanStack Start site, console, admin, workspace, demos, Quasar screens, and cinematic showcase",
    gate: "bun run typecheck && bun run lint && bun run test && bun run build",
    status: "current" as StatusKind,
  },
  {
    path: "migrations/",
    href: "/security",
    purpose:
      "Postgres schema (Neon, or in-memory PGLite without DATABASE_URL): auth, notes, audits, connectors, rate limits",
    gate: "bun run db:migrate (explicit release step)",
    status: "current" as StatusKind,
  },
  {
    path: "sidecars/quasar-service/",
    href: "/quasar/sites",
    purpose:
      "Local AI site-builder service (Bun, port 4700) that the /quasar screens drive; run it yourself, never hosted",
    gate: "bun run test && bun run typecheck (inside the sidecar)",
    status: "experimental" as StatusKind,
  },
  {
    path: "sidecars/python-worker/",
    href: "/workspace",
    purpose:
      "Optional local document extraction and embeddings worker, reached by URL, never spawned",
    gate: "uv run pytest",
    status: "experimental" as StatusKind,
  },
  {
    path: "native/",
    href: "/mobile",
    purpose:
      "Capacitor shell source that loads the deployed site, with an Android project and a CloudKit availability plugin",
    gate: "The native source receipt reports no completed build or sync; native and signed-device acceptance require separate verification",
    status: "partial" as StatusKind,
  },
  {
    path: "notes/",
    href: "/docs",
    purpose:
      "Merge spec, plan and gap matrix, plus the pre-merge MLAI records under notes/mlai/ (docs/ holds the built static site)",
    gate: "reviewed, not built",
    status: "current" as StatusKind,
  },
] as const;

export const integrityRules = [
  {
    title: "Apple sentence",
    body: "The only approved Apple sentence is the one on this site. Do not invent affiliation, endorsement, or silicon partnership.",
  },
  {
    title: "Provenance tags",
    body: "Figures are measured, target, or reported. A target is never a result. Missing a tag is a defect.",
  },
  {
    title: "Apache-2.0",
    body: "ABI and WDBX each include an Apache-2.0 LICENSE in their inspected source revisions. Check the named repository license before reusing its code.",
  },
  {
    title: "Toolchain facts",
    body: "ABI is nightly Rust. Follow each repository README. Do not mix Zig-era claims into the current tree.",
  },
  {
    title: "WDBX unexpanded",
    body: "Do not invent recall, QPS, or latency numbers. Graph defaults are configuration, not a scoreboard.",
  },
  {
    title: "No borrowed benchmarks",
    body: "Site policy: publish a figure only with a named source artifact and a provenance tag. A source report is not an independently reproduced measurement.",
  },
] as const;

export const faqs = [
  {
    q: "Does this website host Abbey?",
    a: "The website does not provision a hosted Abbey product session. Its static preview offers orientation and browser demos. A configured server deployment separately supports signed-in, consent-gated console chat through a model provider. Quasar's browser client connects to a separately running operator-owned service.",
  },
  {
    q: "What can I run with Quesar?",
    a: "The experimental Quasar builder pairs this website's browser client with a separately running local service. The service scaffolds Next.js projects and uses configured Anthropic credentials for generation. Live provider generation remains unverified.",
  },
  {
    q: "Can it run privately?",
    a: "The Quasar service defaults to operator-owned loopback operation. Generation sends requests to the configured provider; local project storage does not make provider inference offline. VPC, on-premise, and hybrid engagements are proposed service scopes.",
  },
  {
    q: "Do you replace existing models?",
    a: "The experimental website builder uses a configured model provider. ABI's local completion path renders deterministic persona templates. Neither implementation establishes a trained Quesar foundation model or an improvement in model quality.",
  },
  {
    q: "Where is the source?",
    a: "Product pages, source pages, docs, and research provide selected source references and README excerpts. The repository catalog is bounded; full source trees and pinned revisions are available through the linked GitHub repositories.",
  },
  {
    q: "What do the status labels mean?",
    a: "Current, Partial, Experimental, In development, Planned, and Research are not interchangeable. Planned is never shipping. Research is not a Quesar product claim.",
  },
] as const;
