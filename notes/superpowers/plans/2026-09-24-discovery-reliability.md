# Quesar Discovery and Reliability

Goal: help technical visitors find projects, documentation, research, and source,
then make those journeys reliable on mobile and imperfect connections.

Baseline: 0497dd6. Preserve the existing design, capability labels, static hosting,
and server/static boundaries. No provider, DNS, database, native, or sidecar work.

## Ordered Deliverables

1. Search: pure catalog/ranking, normalized matching, categories, destination
   deduplication, reference anchors, query/hash preservation, browser harness.
2. Controls: responsive menu cleanup, retryable lazy search, keyboard and focus.
3. GitHub: independent bounded requests, shared loads, per-section cache/freshness,
   partial recovery, explicit retry, curated fallback.
4. Trailer: media-event state, handled play rejection, retry, chapter race guards,
   finite seeking and accessible controls.
5. Gates: browser viewport/theme/motion matrix, accessibility, internal links and
   assets, preload/gzip budgets, full checks and generated static publication.

## Acceptance

Each phase receives focused regression tests and the full local gate, static
build, and browser acceptance before its source and generated-output commits.
Browser tests mock GitHub, run on loopback, and retain failure traces/screenshots.
Final review is independent. Fetch before pushing; create a PR; do not merge or
publish to main without authorization.

## Baseline Budgets

Initial JavaScript includes modulepreloads and script sources, deduplicated by
URL, with each asset gzipped independently.

| Route | Modulepreloads | Gzip bytes |
| --- | ---: | ---: |
| / | 35 | 225362 |
| /docs/ | 40 | 264643 |
| /research/ | 36 | 247971 |
| /developers/ | 38 | 235878 |

## Progress

- Phase 3: complete. Six loader tests cover independent failures, shared loads,
  TTL/cooldown/forced retry, deadlines, malformed data, and retained README data.
  Full gate passed (403 tests), static checks passed, and 21 browser cases passed.
  GitHub request parsing is dynamically loaded; Developers uses 37 preloads
  versus the 38-link baseline. Consumers share refresh and freshness state.

- Phase 2: complete. Three browser regressions reproduced before fixes.
  Full gate passed (397 tests), static build and budgets passed, and all 15
  browser cases passed. Ruling: a narrow Vite build transform gives the search
  entry a fresh import URL because Chromium caches rejected module imports;
  resetting React.lazy alone failed the real-browser recovery test.

- Phase 1: complete. Full gate passed (397 tests); static build passed;
  six discovery browser cases passed across three viewports. Static checker
  passed for 128 pages and all four bundle budgets.
- Ruling: move the existing search page inventory out of shared content and
  retain reference anchors in shared content. This preserves a single source
  while reducing initial JavaScript; home is 224599 gzip bytes versus 225362.
- Endor dependency-risk evidence is unavailable: no Endor lookup tool is exposed.
  Playwright 1.63.0, axe-core/playwright 4.13.0, and parse5 8.0.1 are test-only
  dependencies authorized by the plan; no security verdict is claimed.
