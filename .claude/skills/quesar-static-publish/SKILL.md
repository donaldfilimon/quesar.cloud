---
name: quesar-static-publish
description: Use when republishing docs/ in quesar.cloud, rebuilding the GitHub Pages static site, running bun run build:static, or when a src/ change (content, page, route, component) must reach https://quesar.cloud; also when a rebuild shows ~128 modified pages in docs/ and it is unclear whether anything real changed.
---

# Republishing the quesar.cloud static site

## Overview

`https://quesar.cloud` is GitHub Pages serving `main:/docs`. `bun run build:static` runs the Next.js static export (`next.config.ts` defines `VITE_STATIC_SITE=true` and `VITE_AUTH_ENABLED=false` for it), `scripts/next-export.ts` moves each page to `<path>/index.html`, and `scripts/publish-static.ts` replaces `docs/` wholesale (plus `.nojekyll`, which Pages needs to serve `_next/`, `CNAME` and the sitemap). The build id is the source commit, so rebuilding unchanged source reproduces `docs/` exactly except `feed.xml`'s `<lastBuildDate>` and the live `github-snapshot.json`. `docs/` is build output: never hand-edit it; change `src/` and rebuild.

The site goes live only when a `docs/` rebuild merges to `main`. Follow the recipe below in order; it replaces ad hoc diffing, local servers and browser checks.

## Recipe

Run from the repo root. Each command on its own line; read the exit code from the command itself, never through a pipe.

**1. Before building, if the change adds server-backed UI:** it must check `staticSite` (`src/lib/static-site.ts`) and render `src/components/site/server-only-notice.tsx`. An unguarded server call ships a dead control (server functions refuse in the export). If the change adds or renames a route, run `bun run routes` and commit the regenerated `app/` files with the source (the build fails on drift). Keep heavy data and schemas out of anything `app/layout.tsx` imports: that is on every page.

**2. Gate**, each line separately:

```bash
bun run check >| "${TMPDIR:-/tmp}"/qs-check.log 2>&1; echo EXIT:$?
bun run build:static >| "${TMPDIR:-/tmp}"/qs-static.log 2>&1; echo EXIT:$?
```

`check` runs format:check, typecheck, lint, test and the server build, stopping at the first failure. Both must print `EXIT:0`, and the static log ends with `[publish-static] docs/ ready for quesar.cloud`. If `check` fails only with `Test timed out` in PGLite-backed tests, check `uptime`; under heavy load re-run `bun run check` and publish only after a clean full run. Any other failure stops the publish.

**3. Classify the docs/ change.** First compare the new site with the committed one page by page (same pages, titles, descriptions, canonical URLs; it names any page that appeared or vanished, and only an intended change should show):

```bash
rm -rf "${TMPDIR:-/tmp}"/qs-head && mkdir -p "${TMPDIR:-/tmp}"/qs-head && git archive HEAD docs | tar -x -C "${TMPDIR:-/tmp}"/qs-head
node scripts/next-check.ts --vite "${TMPDIR:-/tmp}"/qs-head/docs --next docs; echo EXIT:$?
```

Then:

```bash
git status --porcelain --untracked-files=all -- docs >| "${TMPDIR:-/tmp}"/qs-status.txt
grep -v '^ M' "${TMPDIR:-/tmp}"/qs-status.txt
```

| Result | Meaning | Action |
|---|---|---|
| Lines listed (`D`/`??` under `docs/_next/static/`) | Real change: new chunk hashes. One edited sentence renames the chunks that carry it. That is expected. | Go to step 4. |
| Nothing listed, only ` M` on pages, `*.txt` payloads and `docs/feed.xml` | Probably build-id noise: every page carries the source commit as its build id, so a new commit re-stamps all of them. | Confirm with the loop below. |

Noise confirmation (prints `REAL:` for any file that differs beyond the build id and the feed date):

```bash
OLD=$(git show HEAD:docs/index.html | grep -ao '"b":"[0-9a-f]*"' | head -1 | cut -d'"' -f4)
NEW=$(grep -ao '"b":"[0-9a-f]*"' docs/index.html | head -1 | cut -d'"' -f4)
git diff --name-only -- docs >| "${TMPDIR:-/tmp}"/qs-changed.txt
while IFS= read -r f; do git show "HEAD:$f" | sed -E "s/$OLD/BUILD/g; s#<lastBuildDate>[^<]*#<lastBuildDate>#" >| "${TMPDIR:-/tmp}"/qs-old; sed -E "s/$NEW/BUILD/g; s#<lastBuildDate>[^<]*#<lastBuildDate>#" "$f" >| "${TMPDIR:-/tmp}"/qs-new; cmp -s "${TMPDIR:-/tmp}"/qs-old "${TMPDIR:-/tmp}"/qs-new || echo "REAL: $f"; done < "${TMPDIR:-/tmp}"/qs-changed.txt
```

Zero `REAL:` lines means nothing user-visible changed: run `git checkout -- docs` and commit no docs/. A noise-only rebuild is never worth a commit.

Every static build also captures a fresh GitHub snapshot (`docs/github-snapshot.json`), because repository metadata and activity change constantly. If the only real change is that snapshot, it is a data refresh, not a source change: commit it only when the refresh is the point, and never let it stand in for "the change landed".

**4. Verify the change landed and the initial JavaScript did not grow.** `grep -a` keeps binary-looking payloads searchable:

```bash
grep -ralc 'your new sentence' docs
grep -ralc 'the old sentence' docs
bun run check:static
```

The new text should appear in the route's `index.html` (and its chunk); the old text should appear nowhere. `check:static` prints each budgeted route's initial scripts and gzip bytes; a jump means something moved onto the initial path (often into what `app/layout.tsx` imports); find it before publishing. No local server or browser pass is needed for a content change; the grep is the check.

**5. Commit and land.** Two commits, source first:

1. The `src/` change, with its own conventional message.
2. `git add -A docs` (deletions included), message **`build(docs): rebuild the static site for <change>`**, where `<change>` names what changed (e.g. `for the WDBX V2 post edit`).

Both end with the repo's `Co-Authored-By` line. `git fetch` first, push the branch, open a PR to `main`; never push to `main` directly, never force-push. If `main` moves before merge, merge `origin/main` into the branch (never rebase a pushed branch: that needs a force-push), rebuild (step 2) and commit the new `docs/` so it matches the merged source.

## Common mistakes

| Mistake | Fix |
|---|---|
| Treating 128 modified pages as a real change | Step 3: no added/deleted assets plus zero `REAL:` lines means noise. |
| "The post text is missing from the built HTML" | It may be only in the route's chunk or `.txt` payload; search `docs/` recursively with `grep -ral`. |
| Serving `docs/` locally and chasing `ERR_CONNECTION_RESET` | A local static server artifact, not a site bug. Skip the server; use step 4. |
| Editing `docs/` by hand, or `src/` and `docs/` in one commit | Rebuild from `src/`; two commits. |
| `cmd \| tail` in the gate | Reports tail's exit code, not the command's. One command per line, `>\|` to a log. |
