# Public Experience Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development. No commits unless separately authorized.

**Goal:** Complete the client/partner public journeys and design.
**Architecture:** Existing TanStack routes and typed content; thin home content; shared editorial components.
**Tech Stack:** React 19, TanStack Start, Bun, Vitest, Playwright.
**Spec:** notes/superpowers/specs/2026-10-01-site-completion-design.md

## Global Constraints
Preserve existing changes, generated-file ownership, editorial tokens and bundle budgets. No dependencies or commits. Content requires draft/audit. All claims retain evidence labels. Implementers never spawn agents.

## Review Focus
Unknown service search values; email drafts mistaken for delivery; small-screen nav; static controls calling servers; stale product claims.

### Task 1: Completion inventory
Files: notes/verification/2026-10-01-site-completion-inventory.md.
- [ ] Inspect every route, journey, room, media and historical gap; record source evidence, required acceptance and dependencies.
- [ ] Review inventory against route tree, media files and current runtime boundaries.

### Task 2: Auditable client copy
Files: src/lib/home-content.ts; src/lib/mlai/categories/services.ts; new src/lib/mlai/categories/client-experience.ts. Produce typed client copy and a claims sheet referencing current source SHAs. Follow existing record schemas; no new unsupported claims.
- [ ] Draft offering and assess/build/harden path copy from existing services and evidence.
- [ ] Run typecheck; independent claims audit before consuming copy.

### Task 3: Home and inquiry journey
Files: src/routes/index.tsx; src/routes/services.tsx; src/routes/contact.tsx; home/contact tests and e2e.
Interfaces: contact accepts validated optional service title from existing services; invalid titles ignored, selected service remains editable.
- [ ] Regression tests for known/unknown service, static draft vs server receipt and failed submission preserving input.
- [ ] Build services-led home from audited content, CTA hierarchy and engagement process; link service inquiries with selected context. Avoid catalog preload.
- [ ] Run focused tests, typecheck and lint; task review.

### Task 4: Section and global completion
Files: platform/products/apps/company/showcase routes, site components, route-specific tests. Reuse audited client content; retain original source-specific claims.
- [ ] Fix concrete route/layout/navigation/state gaps from inventory; refresh six landing pages with coherent evidence and next actions.
- [ ] Browser regression cases at mobile/desktop, themes, reduced motion and keyboard.
- [ ] Root check and static/browser gates; review full public changes.
