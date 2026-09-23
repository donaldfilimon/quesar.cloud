---
name: quesar-static-publish
description: Use when republishing docs/ in quesar.cloud, rebuilding the GitHub Pages static site, running bun run build:static, or when a src/ change (content, page, route, component) must reach https://quesar.cloud; also when a rebuild shows ~128 modified pages in docs/ and it is unclear whether anything real changed.
---

# Republishing the quesar.cloud static site

## Overview

`https://quesar.cloud` is GitHub Pages serving `main:/docs`. `bun run build:static` sets `VITE_STATIC_SITE=true VITE_AUTH_ENABLED=false`, prerenders every crawlable page (`failOnError: true` in `vite.config.ts`), and `scripts/publish-static.ts` replaces `docs/` wholesale (plus `.nojekyll`, `CNAME`, `404.html`). `docs/` is build output: never hand-edit it; change `src/` and rebuild.

The site goes live only when a `docs/` rebuild merges to `main`. Follow the recipe below in order; it replaces ad hoc diffing, local servers and browser checks.

## Recipe

Run from the repo root. Each command on its own line; read the exit code from the command itself, never through a pipe.

**1. Before building, if the change adds server-backed UI:** it must check `staticSite` (`src/lib/static-site.ts`) and render `src/components/site/server-only-notice.tsx`. An unguarded server call fails the prerender. If the change touches a route file, keep schemas and heavy data out of `beforeLoad`, `head`, `validateSearch` and top-level statements (they land in the main bundle; only `component`, and `loader` with `codeSplitGroupings`, are lazy).

**2. Gate**, each line separately:

```bash
bun run check >| "${TMPDIR:-/tmp}"/qs-check.log 2>&1; echo EXIT:$?
bun run build:static >| "${TMPDIR:-/tmp}"/qs-static.log 2>&1; echo EXIT:$?
```

`check` runs format:check, typecheck, lint, test and the server build, stopping at the first failure. Both must print `EXIT:0`, and the static log ends with `[publish-static] docs/ ready for quesar.cloud`. If `check` fails only with `Test timed out` in PGLite-backed tests, check `uptime`; under heavy load re-run `bun run check` and publish only after a clean full run. Any other failure stops the publish.

**3. Classify the docs/ change.**

```bash
git status --porcelain --untracked-files=all -- docs >| "${TMPDIR:-/tmp}"/qs-status.txt
grep -v '^ M' "${TMPDIR:-/tmp}"/qs-status.txt
```

| Result | Meaning | Action |
|---|---|---|
| Lines listed (`D`/`??` under `docs/assets/`) | Real change: new chunk hashes. One edited sentence can rename ~90 chunks and touch every page's script links. That is expected. | Go to step 4. |
| Nothing listed, only ` M` on `index.html` pages and `docs/feed.xml` | Probably timestamp noise: each page embeds a router match time `u:<epoch ms>`, and `feed.xml` has `<lastBuildDate>`. | Confirm with the loop below. |

Noise confirmation (prints `REAL:` for any file that differs beyond timestamps):

```bash
git diff --name-only -- docs >| "${TMPDIR:-/tmp}"/qs-changed.txt
while IFS= read -r f; do git show "HEAD:$f" | sed -E 's/u:[0-9]+/u:T/g; s#<lastBuildDate>[^<]*#<lastBuildDate>#' >| "${TMPDIR:-/tmp}"/qs-old; sed -E 's/u:[0-9]+/u:T/g; s#<lastBuildDate>[^<]*#<lastBuildDate>#' "$f" >| "${TMPDIR:-/tmp}"/qs-new; cmp -s "${TMPDIR:-/tmp}"/qs-old "${TMPDIR:-/tmp}"/qs-new || echo "REAL: $f"; done < "${TMPDIR:-/tmp}"/qs-changed.txt
```

Zero `REAL:` lines means nothing user-visible changed: run `git checkout -- docs` and commit no docs/. A noise-only rebuild is never worth a commit.

**4. Verify the change landed and the main bundle did not grow.** Built pages contain NUL bytes, so plain `grep` silently reports no match. Always use `grep -a`:

```bash
grep -ralc 'your new sentence' docs
grep -ralc 'the old sentence' docs
git show HEAD:docs/index.html >| "${TMPDIR:-/tmp}"/qs-index-head.html
grep -ao 'rel="modulepreload"' "${TMPDIR:-/tmp}"/qs-index-head.html | wc -l
grep -ao 'rel="modulepreload"' docs/index.html | wc -l
```

The new text should appear in the route's `index.html` (and its chunk); the old text should appear nowhere. A higher `modulepreload` count means something moved into the main bundle; find it (step 1) before publishing. No local server or browser pass is needed for a content change; the grep is the check.

**5. Commit and land.** Two commits, source first:

1. The `src/` change, with its own conventional message.
2. `git add -A docs` (deletions included), message **`build(docs): rebuild the static site for <change>`**, where `<change>` names what changed (e.g. `for the WDBX V2 post edit`).

Both end with the repo's `Co-Authored-By` line. `git fetch` first, push the branch, open a PR to `main`; never push to `main` directly, never force-push. If `main` moves before merge, merge `origin/main` into the branch (never rebase a pushed branch: that needs a force-push), rebuild (step 2) and commit the new `docs/` so it matches the merged source.

## Common mistakes

| Mistake | Fix |
|---|---|
| Treating 128 modified pages as a real change | Step 3: no added/deleted assets plus zero `REAL:` lines means noise. |
| "The post text is missing from the built HTML" | Plain grep false negative on NUL bytes. Use `grep -a`. |
| Serving `docs/` locally and chasing `ERR_CONNECTION_RESET` | A local static server artifact, not a site bug. Skip the server; use step 4. |
| Editing `docs/` by hand, or `src/` and `docs/` in one commit | Rebuild from `src/`; two commits. |
| `cmd \| tail` in the gate | Reports tail's exit code, not the command's. One command per line, `>\|` to a log. |
