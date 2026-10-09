# Static contact document diagnosis and correction

Date: 2026-10-09
Canonical checkout: `/Users/donaldfilimon/dev/active/quesar.cloud`
Observed committed base: `4ab275be`; concurrent commits and other agents' changes were preserved.
Status: source correction and focused static qualification passed; parent owns final root/full-browser gates and local-main commit. No push or deployment was performed.

## First broken invariant

The failing contact page was already broken before React or hydration ran:

- Initial `docs/contact/index.html`: **0 bytes**, created/modified 17:17:52 local.
- Initial `.output/public/contact/index.html`: **0 bytes**, created/modified 17:17:51 local.
- Preserved failure trace: direct `GET /contact` answered **HTTP 416, 0 bytes**. `scripts/serve-static.ts` computes an invalid byte interval for an empty file and answers 416; the blank browser document follows from that response. Increasing timeouts or changing contact UI assertions would not fix this.
- Current generated route tree has one `/contact` route and no test-file routes. The parent's `-auth-entry.test.tsx` and `-contact.test.tsx` renames were preserved, not reversed.

Before running any focused browser tests, the entire prior `test-results/` directory was moved to:

`artifacts/static-contact-blank-2026-10-09/test-results/`

This preserves the original failed screenshots, error contexts and trace ZIPs, plus prior successful screenshots. `inspect-trace.py` in the same artifact directory reads the preserved network trace without extracting or modifying it; its inspection returned exit 0 and reported the 416/zero-byte contact response.

## Diagnosis and uncertainty

The parent's failing build transcript (`tool_122878950001vamvByakOcg81C`) shows `/contact` and eleven `/contact?service=...` crawl jobs with concurrency 10. The installed TanStack Start prerenderer (`@tanstack/start-plugin-core/src/prerender.ts`) deduplicates by the full URL but strips query/fragment state when selecting the output filename, then writes each response into that filename. All those contact jobs therefore write the same `contact/index.html`.

This is a verified configuration-level multiple-writer defect, not a contact-component failure. The empty-file outcome is consistent with a truncate/read/overwrite race in that shared output. The exact syscall interleaving was not captured, so it is not claimed as individually proven.

There was also an external output replacement during diagnosis: without an implementer rebuild, `docs/contact/index.html` became 25,548 bytes at 17:33:02, with `.output/public/contact/index.html` dated 17:31:44. That observation was surfaced to the parent. A pre-rebuild static check then failed on twelve poster/source mismatches, not on empty contact HTML. No poster or other agent's source was edited to force a pass. A fresh controlled rebuild resolved the copied-media mismatches.

The failing transcript also contains an unhandled 404 prerender request despite a successful build exit. `/404` is not an application route; the existing publisher already synthesizes standalone `404.html`.

## Implementation Summary

1. Added a tested static prerender path filter that retains canonical routes and the existing media/API/server-function exclusions, but rejects query/fragment variants. Browser links and service search state remain unchanged and work through the canonical document after hydration.
2. Removed the nonexistent `/404` prerender seed. The existing standalone 404 generation remains unchanged.
3. Made `check:static` reject empty or whitespace-only HTML even when a pathname exists and has no missing asset references.
4. Made the static publisher reject empty/whitespace-only prerendered HTML **before deleting/replacing `docs/`**. Tests verify an existing published tree is preserved on refusal.
5. Rebuilt static output once from the corrected source. No generated HTML was hand-edited, no component was replaced with fake contact markup, no timeout/budget was raised, and no browser test was weakened.

Changed source/test files:

- `vite.config.ts`
- `scripts/static-prerender-path.ts` (new)
- `scripts/static-prerender-path.test.ts` (new)
- `scripts/check-static.ts`
- `scripts/check-static.test.ts`
- `scripts/publish-static.ts`
- `scripts/publish-static.test.ts` (new)

Additional changes: this report, ignored diagnostic scripts/preserved evidence, and generated `docs/` from the authorized build. Contact/auth production components, renamed route tests, independent review notes, public recut media/proofs, raw records and package-lock were not edited by this slice.

## Actual verification

- `bun run test scripts/static-prerender-path.test.ts scripts/check-static.test.ts scripts/publish-static.test.ts`: **10 tests in 3 files passed, exit 0**. Negative fixtures cover blank/whitespace documents, canonical path selection, and refusing publication without replacing the existing site.
- `bun run typecheck`: **exit 0**.
- Targeted installed ESLint with `--max-warnings 0` and Prettier `--check` over all seven source/test files: **exit 0** after correcting formatting-only warnings.
- `bun run build:static`: **exit 0**. Full captured output: `tool_12298b65b0010WQABgbiPY7k77`. It crawls `/contact` exactly once, no query/fragment variants, and no `/404` seed; it prerenders 142 URL jobs and publishes a sitemap with 118 entries.
- `bun run check:static`: **exit 0**, checking 129 HTML files. Preload budgets remained 17/21, 17/21, 19/23 and 22/25 for the four guarded routes. Empty documents and copied-media mismatches were absent in this check.
- Focused browser command below: **20/20 passed, exit 0**. These unchanged tests include all previously failing contact cases plus existing navigation checks, across desktop, 200%-equivalent viewport, mobile, short-mobile and light/dark configurations.

```sh
bun run test:e2e e2e/accessibility.spec.ts e2e/public-journey.spec.ts --grep 'contact|service inquiry|static drafts|failed submission'
```

The focused run exercised direct contact documents, static receipt labels, editable-form validation failure, service-context SPA navigation and direct navigation to unknown service context. Existing GitHub browser fixtures were retained.

An additional owned loopback static-server HTTP diagnostic checked `/contact`, `/contact?service=Unknown` and `/contact?service=Private+AI+Deployment`: all answered **200 with 25,548 bytes**, theme markup and the Name field. All served the same canonical document SHA256:

`21629c6d131f87069feb7da82a334295b821adbf98656c9bbfdb1e4eeb74b572`

That diagnostic returned exit 0 and terminated only its own child server. The three pre-existing static-server processes observed during diagnosis were left alone. The Playwright-managed focused server also used its own isolated loopback port.

Scoped source diff review/whitespace checks passed. Full root and full 226-case browser runs were not repeated by the implementer; the parent must requalify those against these final source changes. No Postgres resources, dependency installation, secrets, alternate checkout, Git writes, commit, push, deployment or external message were used.
