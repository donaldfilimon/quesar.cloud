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

- Phase 5: complete. Full gate passed (408 tests / 49 files), static build passed,
  and 91 Chromium browser cases passed. Accessibility covers five routes and
  search in light/dark, reduced motion, three viewports, and simulated 200%
  desktop reflow. Native browser zoom and other browser engines are unmeasured.
- The static gate checks 128 HTML pages, CSS assets, generated search destinations,
  and four initial-JavaScript budgets. Final gzip bytes: home 225242, docs 263598,
  research 247532, developers 234392. Preloads: 35, 39, 36, 37 respectively.
- Ruling: browser testing proved that a failed dependency remains poisoned even
  with a fresh panel entry. Generate the search catalog as JSON from typed
  content and fetch it on intent, keeping data retries out of the module cache.
  This adds one deferred data request and a small Vite build/dev plugin, but
  avoids a page reload that could discard user input. Both entry and data
  failure recovery pass browser tests; the page data remains single-source.
- Accessibility fixes: focus the main landmark through the skip link and
  underline the Developers inline skill link.
- Independent review: pending.

- Phase 4: complete. Full gate (403 tests), static build/budgets, and 36 browser
  cases passed. The corrected playback-rejection test failed against the
  original MP4 player before passing against this implementation.
- Ruling: expose existing full chapter mode on /showcase, where the MP4 player
  actually lives. /showcase/trailer is a separate cinematic renderer and was
  the wrong test target; its initial test failures are not regression evidence.
  The homepage remains a one-cut teaser.

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
