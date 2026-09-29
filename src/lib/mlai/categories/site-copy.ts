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
    gate: "bun run build (applies migrations)",
    status: "current" as StatusKind,
  },
  {
    path: "sidecars/quasar-service/",
    href: "/quasar/sites",
    purpose:
      "Local AI site-builder service (Bun, port 4700) that the /quasar screens drive; run it yourself, never hosted",
    gate: "bun test",
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
      "Capacitor shell that loads the deployed site; Android project and CloudKit plugin, iOS blocked on CocoaPods",
    gate: "not gated (no Capacitor build on this machine)",
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
    body: "Core runtimes ship Apache-2.0. Do not relicense by implication or copy a proprietary notice onto public crates.",
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
    body: "If a number is not in the public skill-creator master reference or a named source artifact, it does not ship.",
  },
] as const;

export const faqs = [
  {
    q: "Does this website host Abbey?",
    a: "No. This site orients and offers a signed-in console for field notes. The Abbey workspace, Quasar builder, and mobile vault on this site are in-browser orientations of local apps — they do not provision a hosted session.",
  },
  {
    q: "Is Quesar a chatbot?",
    a: "No. Quesar is the large model that trains and improves Abbey, Aviva, and the other assistants. Chat is an interface on an assistant. This website does not host the model or an assistant session.",
  },
  {
    q: "Can it run privately?",
    a: "Yes. Default posture is operator-owned machines. VPC, on-premise, hybrid, and offline-first paths are the design. Remote providers are optional and credential-gated.",
  },
  {
    q: "Do you replace existing models?",
    a: "Quesar is the large model that trains and improves Abbey, Aviva, and the other assistants. That is not a claim that this website replaces a provider you already run, or that local template completion is that model. This site does not host Quesar or run training.",
  },
  {
    q: "Where is the source?",
    a: "On this site. Product pages, /source/:name, docs, and research carry the public tree. GitHub is the backing store — you do not need to leave to read it.",
  },
  {
    q: "What do the status labels mean?",
    a: "Current, Partial, Experimental, In development, Planned, and Research are not interchangeable. Planned is never shipping. Research is not a Quesar product claim.",
  },
] as const;
