# Contact and authentication implementation

Date: 2026-10-09
Canonical checkout: `/Users/donaldfilimon/dev/active/quesar.cloud`
Base: `main`, `2e768841`
Status: Source implementation delivered for parent-owned gate and acceptance.

No review file or summary path was supplied for the initial slice. The follow-up supplied `notes/verification/2026-10-09-auth-contact-review.md`; its R1-R7 source findings now have fixed statuses and implementation responses. Other summaries and raw evidence were not changed.

## Latest review follow-up

The sections below this follow-up preserve the initial 46-test receipt and original changed-file list. The current aggregate source changes and fresh qualification are recorded here.

All seven review findings are fixed in source:

- Canonical same-origin redirect validation rejects raw URL controls, all backslashes, encoded path separators/controls, malformed encodings, normalized auth/API loops and encoded auth-route names. A Node URL-parser reproduction established the original off-origin normalization. Safe query/fragment intent is preserved.
- Public email/phone now also appear in the shared footer.
- Signup intent remains explicit and static signup remains a notice.
- Optional contact receipt storage is best-effort. Throwing storage preserves draft/accepted evidence in memory and produces settled `done` status; displayed wording distinguishes outcome from persistence.
- A synchronous in-flight guard spans email, social, passkey and mode actions, prevents competing handlers before rerender and permits retry after failure. Email event registration was deferred to the actual event to satisfy React Compiler lint without a suppression.
- Header and profile signout failures now display accessible inline alerts, preserve the session and allow retry. The client still navigates only on confirmed success.
- OAuth error callbacks preserve sanitized return intent. Recognized failures receive fixed feedback; provider descriptions are not displayed, and a missing provider-start redirect is reported rather than left pending.

Additional narrow copy cleanup updates the privacy deployment boundary and paired/loopback-default Quasar service description, the founder's current Rust ABI/WDBX paragraph, publisher/feed naming to the existing `site.company` (MLAI), and the obsolete five-minute session-cache warning. Evidence references: `src/lib/auth/server.ts` session configuration; `src/lib/server/inquiries.server.ts` acceptance; `src/lib/mlai/pages.ts` account/consent/privacy boundaries; `sidecars/quasar-service/README.md` Pairing and transport; and `src/lib/mlai/categories/blog.ts` Rust migration record. No sidecar code, historical Zig articles or provider configuration was rewritten.

### Current changed-file inventory

Production source (19 files):

- `src/components/auth/login-form.tsx`
- `src/components/profile/sessions-card.tsx`
- `src/components/site/footer.tsx`
- `src/lib/auth/callback.ts` (new)
- `src/lib/auth/client.ts`
- `src/lib/auth/email-password.ts`
- `src/lib/auth/gates.tsx`
- `src/lib/contact-context.ts`
- `src/lib/internal.ts`
- `src/lib/mlai/categories/team.ts`
- `src/lib/mlai/feed.ts`
- `src/lib/mlai/pages.ts`
- `src/lib/mlai/structured-data.ts`
- `src/lib/site-identity.ts`
- `src/routes/contact.tsx`
- `src/routes/login.tsx`
- `src/routes/privacy.tsx`
- `src/routes/profile.tsx`
- `src/routes/signup.tsx`

Regression source (10 files):

- `src/components/profile/profile-cards.test.tsx`
- `src/lib/auth/callback.test.ts` (new)
- `src/lib/auth/client.test.ts` (new)
- `src/lib/auth/email-password.test.ts` (new)
- `src/lib/contact-context.test.ts`
- `src/lib/internal.test.ts`
- `src/lib/mlai/feed.test.ts`
- `src/lib/mlai/structured-data.test.ts`
- `src/routes/auth-entry.test.tsx` (new)
- `src/routes/contact.test.tsx` (new)

Compiled acceptance source: `e2e/backend/persistent.acceptance.ts`. It now uses real compiled `/signup` forms for both independent users and adds header/profile signout failure/retry, protected return intent, callback-error feedback, wrong-password and successful email login, delayed-request busy controls, secure-session reload, unsafe redirect refusal, and server-accepted inquiry with storage denial. Existing seeded isolation, foreign read/ciphertext refusal, restart and dump/restore assertions remain intact. This acceptance suite was authored and typechecked, not run by the implementer.

Documentation: this summary and dispositions/responses plus Implementation Summary in `notes/verification/2026-10-09-auth-contact-review.md`.

### Fresh targeted qualification

```sh
bun run test src/routes/auth-entry.test.tsx src/routes/contact.test.tsx src/lib/auth/email-password.test.ts src/lib/auth/client.test.ts src/lib/auth/callback.test.ts src/lib/contact-context.test.ts src/lib/internal.test.ts src/lib/mlai/structured-data.test.ts src/lib/mlai/feed.test.ts src/lib/auth/acceptance-regressions.test.ts src/lib/auth/methods.server.test.ts src/lib/server/admin.server.test.ts src/components/profile/profile-cards.test.tsx
```

Final follow-up result: **13 files, 77 tests passed; exit code 0**, run at local 16:43 on 2026-10-09 after the full diff review and test-harness simplification.

Final `bun run typecheck`: **exit code 0**. Targeted installed ESLint (`--max-warnings 0`) and Prettier `--check` over all 30 changed source/test/acceptance files: **exit codes 0/0**; the two files simplified during final review were rechecked with both tools and passed. Final scoped diff whitespace check: **exit code 0**. No dependency installation or lint suppression was added.

The root gate, builds, static output, servers, Postgres and every Playwright run remain parent-owned and unrun by this implementer. Source fixes do not establish final independent approval, browser acceptance or hosted authentication. The parent will make the requested local-main commit after its validation; no implementer Git commit/staging/push was performed, and no push was requested.

## Initial implementation record

## Changes

- Centralized the requested public contact in `site.contact`: `cbkshadow@icloud.com`, display phone `813-755-0156`, international phone `+18137550156`.
- Updated the contact form's static email draft destination, explanation, and notification. Added visible native `mailto:` and `tel:` anchors to the existing Direct paths card, usable before hydration and with no authentication requirement.
- Reused the address in careers, responsible disclosure, and privacy copy. Added the same email and international phone to the existing JSON-LD publisher identity without renaming or changing the branding.
- Fixed `/signup` opening the sign-in form: it now routes to `/login?next=%2Fconsole&mode=signup`. Login validates the mode and the form reads it from route search; toggling mode retains the existing redirect target and form values.
- Disabled competing auth controls and mode switching while an auth request is pending. Whitespace-only optional signup names now use the existing email-local-part fallback.
- Extended the existing redirect guard to exclude signup destinations and auth-entry fragments, avoiding a redirect back into the auth flow.
- Removed the duplicate contact-route email constant and corrected obsolete comments claiming email/password is disabled and auth config is frozen. No auth provider configuration or server authorization policy was changed.

## Changed files

Production:

- `src/lib/site-identity.ts`
- `src/routes/contact.tsx`
- `src/lib/mlai/pages.ts`
- `src/lib/mlai/structured-data.ts`
- `src/routes/login.tsx`
- `src/routes/signup.tsx`
- `src/components/auth/login-form.tsx`
- `src/lib/internal.ts`
- `src/lib/auth/email-password.ts`

Regression coverage:

- `src/routes/contact.test.tsx` (new)
- `src/routes/auth-entry.test.tsx` (new)
- `src/lib/auth/email-password.test.ts` (new)
- `src/lib/internal.test.ts`
- `src/lib/mlai/structured-data.test.ts`

This summary is the only documentation addition.

## Verified locally

Toolchain observed: Bun `1.4.2`, Node `v26.11.1`. Vitest was invoked through the repository's Bun script, not bare `bun test`.

```sh
bun run test src/routes/auth-entry.test.tsx src/routes/contact.test.tsx src/lib/auth/email-password.test.ts src/lib/auth/acceptance-regressions.test.ts src/lib/internal.test.ts src/lib/mlai/structured-data.test.ts src/lib/auth/methods.server.test.ts src/lib/server/admin.server.test.ts
```

Final result: **8 files, 46 tests passed; exit code 0**.

These checks exercise:

- Real Better Auth email signup and password signin, persisted in the embedded test database, with session resolution and wrong-password rejection.
- The application's actual auth client's signup/signin/session API against the real handler through an in-process fetch adapter. The adapter resolves relative URLs and carries cookies manually; this is not browser cookie acceptance.
- Untrusted-origin refusal. Installed Better Auth defaults to skipping origin checks under `NODE_ENV=test`; the test explicitly enables that context check for this assertion and restores the previous value afterward. Production source was not changed to bypass security.
- Existing name limits, revoked-session handling, verified Google/Apple provenance, and admin refusal cases.
- Rendered login/signup modes, competing controls disabled during submission, absence of unconfigured social buttons, and honest static notices.
- Public contact links and copy, structured-data contacts, and auth-entry redirect exclusions.

Final `bun run typecheck`: **exit code 0**.

Targeted installed ESLint over all 14 changed source/test files with `--max-warnings 0`: **exit code 0**.

Targeted installed Prettier `--check` over all 14 changed source/test files: **exit code 0**.

Final `git diff --check`: **exit code 0**. The tracked source diff and new tests were reviewed locally.

Early verification failures were corrected before the final passing runs. Required mode typing initially broke existing login links and was changed to an optional search field with an explicit default. Test fixtures also needed a mocked contact-route hook, explicit activation of Better Auth's origin check, relative-URL resolution in the client adapter, and explicit getter-backed form-state properties. The failed runs were not counted as passing results.

## Remaining acceptance and boundaries

- The parent owns `bun run check`, production/persistent builds, the static rebuild, `check:static`, Playwright, development servers, and Postgres acceptance. None of those were launched in this slice. The repository gate and browser/server deployment acceptance remain pending, so this summary does not declare the repository finished or production-ready.
- `https://quesar.cloud` is documented as static GitHub Pages. Static `/login` and `/signup` still show server-only notices and never fabricate a session. Live public authentication requires an approved server deployment and HTTPS auth origin, durable Postgres with applied migrations, and a stable signing secret. No hosting/origin approval, credentials, deployment, or live OAuth acceptance was attempted.
- Public contact changes reach the hosted static site only after the parent's rebuild and authorized publication. Native email/telephone handlers and actual delivery were not exercised here.
- Existing synthetic test identities, real account data, admin allowlist configuration, OAuth credentials, user-scoping rules, generated `docs/`, sidecars, untracked raw evidence, and `package-lock.json` were left untouched. New tests create synthetic accounts only in their embedded test database. No alternate checkout was accessed; no commit, push, PR, deployment, paid call, or external message was made.
- The requested `~/AGENTS.md` read was denied by the tool. Repository `AGENTS.md` and `CLAUDE.md` were read; focused searches found no nested instruction files in the touched source or notes scope. No alternate access path was attempted.
