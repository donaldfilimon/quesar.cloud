# Task 6: audit expiry failure logging

Current: implemented and focused checks pass. Root gate and deployment qualification belong to the controller.

## Owned changes

- `src/routes/api/cron/audits-expire.ts`: replace the catch-bound raw exception logging with one static `Audit expiry failed` event. Exceptions can contain database connection strings and audit records; none are needed to identify this failure event.
- `src/routes/api/cron/-audits-expire.test.ts`: two parameterized route-handler regression cases, GET and POST. Each injects an Error with a synthetic credential in its message and a private-record detail. Tests prove HTTP 500, the existing safe JSON body, no-store, and exactly one static console error argument, excluding both the original exception and synthetic sensitive values.

The route test follows existing router-mock conventions and captures the registered handlers; no production internals were exported. The leading dash excludes the test from file-route generation.

## Verification

Executed in `/Users/donaldfilimon/dev/active/quesar.cloud` on 2026-10-09:

1. `bunx prettier --write src/routes/api/cron/audits-expire.ts src/routes/api/cron/-audits-expire.test.ts` — exit 0 (combined sequential shell run).
2. `bunx vitest run src/routes/api/cron/-audits-expire.test.ts` — exit 0; 1 file passed, 2 tests passed, Vitest v5.0.3.
3. `bunx eslint src/routes/api/cron/audits-expire.ts src/routes/api/cron/-audits-expire.test.ts --max-warnings 0` — exit 0 (combined sequential shell run).
4. `bunx prettier --check src/routes/api/cron/audits-expire.ts src/routes/api/cron/-audits-expire.test.ts` — exit 0; all matched files conform.

No root gate, build, standalone typecheck, install, dependency update, commit, or remote action was run. Controller will run serial root typecheck and gate. Shared-tree package.json/bun.lock changes reported by controller were preserved and are outside this task's ownership.

## Self-review

Reviewed the complete owned diff and test source. Production change is two lines: exception binding removal and static logging. Authorization, rate-limit order/options, GET/POST registrations, success response, all error statuses, and no-store remain unchanged. The focused test fails against the original logging call because it includes an extra Error argument and the old event punctuation. Existing unrelated dirty files are untouched. This covers the demonstrated `expireAudits` catch-path leak; it does not qualify other logging paths or persistent staging deployment.
