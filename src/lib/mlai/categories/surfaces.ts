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
    body: "The browser workspace requires a browser; model requests require the configured server path.",
    code: null,
    href: "/workspace",
    journey: "abbey",
  },
  {
    title: "Quasar service",
    body: "A standalone Bun project under sidecars/. Its tests and typecheck do not run in the website gate. Generation needs Anthropic credentials.",
    code: "cd sidecars/quasar-service\nbun run test\nbun run typecheck",
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
    role: "Experimental browser client paired to a local Bun service; generation requires Anthropic credentials",
    status: "experimental" as StatusKind,
    journey: "quasar",
  },
  {
    surface: "Abbey workspace",
    role: "Browser document preview with localStorage documents and an optional configured server model-request path",
    status: "current" as StatusKind,
    journey: "abbey",
  },
  {
    surface: "Mobile companion",
    role: "Browser vault preview uses localStorage; separate Capacitor source is not signed-device sync acceptance",
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
    body: "Developers and operators evaluating a local website-building workflow, with explicit provider configuration and source setup requirements.",
  },
  {
    title: "How it differs",
    body: "The experimental Quasar builder combines browser pairing, an operator-owned service, and a configured generation provider. ABI, WDBX, and Abbey are separate source projects; this builder does not establish a training pipeline between them.",
  },
  {
    title: "What you can build",
    body: "The Quasar service scaffolds Next.js projects and implements provider-assisted file edits and a local preview. Live provider generation requires separate acceptance. ABI tools and WDBX retrieval have their own source and integration requirements.",
  },
  {
    title: "What you cannot assume",
    body: "The static website provides orientation and browser previews. A configured server separately supports consent-gated console chat; the Quasar browser client requires a running paired service for generation. Neither surface establishes a hosted Abbey product session, a managed deployment service, or live provider acceptance.",
  },
] as const satisfies readonly QuesarWhatCard[];

/** Browser preview requirements and storage scope, shared with the Abbey journey. */
export const abbeyWorkspaceFacts = [
  ...abbeyRequirements,
  "Documents are stored in this browser's localStorage",
  "The static workspace preview cannot call a model; configured server chat is a separate path",
] as const;
