import type { StatusKind } from "@/lib/site-identity";

import type { QuesarSurface, QuesarWhatCard, SetupCard } from "../schemas-surfaces";
import { abbeyRequirements } from "./product-journeys";

/**
 * Surface and setup copy that restates the product journeys. `journey` names
 * the record in `product-journeys.ts` a row repeats (data only, not rendered);
 * `src/lib/mlai/surfaces.content.test.ts` keeps statuses and links in step.
 */

export const setups = [
  {
    title: "Website (this surface)",
    body: "From this repository root: formatting, types, lint, tests, and the server build. Publish the static site with a separate build.",
    code: "bun run check\nbun run build:static",
    href: "/docs/deployment",
  },
  {
    title: "Abbey workspace",
    body: "The browser workspace here is a preview. The separate local Abbey app has its own setup and verification in its source README.",
    code: null,
    href: "/workspace",
    journey: "abbey",
  },
  {
    title: "Quasar service",
    body: "A standalone Bun project under sidecars/. Its tests and typecheck do not run in the website gate. Generation needs Anthropic credentials.",
    code: "cd sidecars/quasar-service\nbun test\nbun run typecheck",
    href: "/quesar",
    journey: "quasar",
  },
  {
    title: "Mobile and native",
    body: "The web vault is a browser preview. The separate native shell has no root check script; Android sync and device validation are separate work.",
    code: null,
    href: "/mobile",
    journey: "mobile",
  },
  {
    // Spans the ABI and WDBX journeys and links /abi rather than either
    // journey's setup page, so it names no single journey.
    title: "ABI + WDBX",
    body: "Clone both. Use ./tools/cargo.sh. Bare cargo is the wrong entry.",
    code: "./tools/check.sh",
    href: "/abi",
  },
] as const satisfies readonly SetupCard[];

export const quesarSurfaces = [
  {
    surface: "This website",
    role: "Product orientation and source setup links",
    status: "current" as StatusKind,
  },
  {
    surface: "Local site builder (Quasar)",
    role: "Prompt-to-Next.js on your machine (Bun + Expo, Anthropic credentials)",
    status: "experimental" as StatusKind,
    journey: "quasar",
  },
  {
    surface: "Abbey workspace",
    role: "Local document workspace with assistant context",
    status: "current" as StatusKind,
    journey: "abbey",
  },
  {
    surface: "Mobile companion",
    role: "Source-based Expo app; native CloudKit is distinct from web export",
    status: "partial" as StatusKind,
    journey: "mobile",
  },
  {
    surface: "Hosted Quesar cloud",
    role: "Managed sessions, generation, authentication",
    status: "planned" as StatusKind,
  },
] as const satisfies readonly QuesarSurface[];

export const quesarWhat = [
  {
    title: "Who it is for",
    body: "Developers, technical organizations, and privacy-conscious operators who need AI systems that keep context, expose provenance, and run across local, edge, and optional remote compute.",
  },
  {
    title: "How it differs",
    body: "Conventional apps bolt memory onto a chat transcript. Quesar treats memory as a substrate (WDBX), orchestration as a runtime (ABI), and the assistant as an experience (Abbey) — with claim-honest status on every surface.",
  },
  {
    title: "What you can build",
    body: "Local assistant workflows with inspectable context. Retrieval over signed episodic records. Tools and plugins under ABI contracts. A local site-generation loop that writes a real Next.js project onto disk.",
  },
  {
    title: "What you cannot assume",
    body: "This website does not provision an assistant or generate sites. Sign-in opens a console for field notes, not an Abbey session. The local builder does not host, deploy, or bill. Production sharding is not established.",
  },
] as const satisfies readonly QuesarWhatCard[];

/** The toolchain rows come from `abbeyRequirements`, shared with the Abbey journey. */
export const abbeyWorkspaceFacts = [
  ...abbeyRequirements,
  "SQLite / Better Auth in the local app",
  "Private databases and uploaded documents are not part of the public import",
  "This site does not open a chat",
] as const;
