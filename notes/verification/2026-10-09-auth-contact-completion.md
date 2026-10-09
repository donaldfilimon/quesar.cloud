# Authentication and contact completion

Date: 2026-10-09. Canonical local main. This record supersedes the pending
qualification statements in the implementation and review reports.

## Delivered

Public contact is centralized as `cbkshadow@icloud.com` and `813-755-0156`,
with accessible email and `tel:+18137550156` links. Contact, footer,
careers/privacy/security copy and existing publisher metadata use that source.

Direct signup opens account creation. Authentication methods share an
in-flight guard; sign-out and OAuth callback failures have usable feedback.
Redirect validation rejects raw controls and normalized protocol-relative
paths. Contact fields are frozen during submission, and optional local receipt
storage cannot invalidate an accepted inquiry or leave the form busy.

Static prerendering now excludes query/fragment variants that would write the
same HTML path concurrently. Both checking and publishing reject blank HTML,
and publisher refusal preserves the existing published tree. Route tests use
the repository's ignored `-` prefix. No browser assertions or budgets were
weakened. Independent source review approved the auth/contact corrections and
the static publishing repair with no blocking findings.

## Actual verification

- Final `bun run check`: exit 0, 104 Vitest files / 823 tests; formatting,
  typecheck, lint and default server build passed.
- Separate sidecar typecheck and suite: exit 0, 113 tests / 486 expectations.
- Persistent build and real compiled browser/PostgreSQL acceptance: exit 0,
  one scenario passed in 45.3 seconds. Tested rendered signup in independent
  contexts, header/profile sign-out failure and retry, wrong-password refusal,
  successful email sign-in, busy controls, secure-session reload and sanitized
  return targets. Also tested delayed contact submission, local-storage denial,
  exactly one stored inquiry, user isolation, audit decryption/refusal,
  application restart and matching restore of 15 PostgreSQL tables.
- Qualified persistent output-tree SHA256 remained unchanged during acceptance:
  `5a503b65d7e6b572ae207a1cfc495d44e83bd9482164ec964699d649c2b50626`.
  Subsequent builds replaced mutable `.output/`; this identifies the tested
  snapshot, not an immutable archive or remote deployment.
- Corrected static build: exit 0. Final `check:static`: exit 0, 129 HTML pages.
  Final complete `test:e2e`: exit 0, 226 tests passed in 5.5 minutes.
  Home: 17/21 preloads, 163757/225362 gzip bytes.
- The final explicit `.ts` import-path cleanup passed typecheck; it does not
  change the imported module or application behavior.

The full final root/static/browser output is retained by the harness as
`tool_122a93cb4001269loVWITLI6Yp`. Earlier successful and failed snapshots remain
distinct. An initial persistent fixture failed after partial success because
page interception teardown did not await the held route callback; the final
passing rerun used the corrected callback drain. A later full static run had
17 failed contact cases / 209 passes due to zero-byte HTML; preserved traces
and the verified multiple-writer configuration are described in
[the static contact report](2026-10-09-static-contact-report.md).

## Cleanup and operational boundary

The newly owned PostgreSQL fixture was stopped only after checking its exact
PID/data directory/listener, default databases and zero other clients. Stop
exited 0; PID and listener were absent afterward. Ignored diagnostic evidence
and fixture data remain preserved. Other sessions' work, existing servers,
older stashes and the permission-denied external fixture were left intact.
Concurrent sessions committed source/evidence/media changes during this run;
their commits were preserved without rewriting history.

The latest instruction authorizes local-main commits, not a new push or
deployment. The configured server's email/password path is verified locally.
GitHub Pages still has no auth backend, so public signup/signin requires a
configured persistent server and origin deployment. Contact server acceptance
means stored by the site, not delivered email. Static contact opens a draft.
No real OAuth-provider acceptance, paid call, production-secret use or remote
cutover is claimed.
