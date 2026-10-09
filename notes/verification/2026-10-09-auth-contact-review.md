# Auth/contact review: independent source follow-up

Date: 2026-10-09  
Reviewer scope: independent source review in the canonical `quesar.cloud` checkout.  
Baseline observed by read-only Git command: `2e76884114c5`.  
Latest **SOURCE verdict: Approved, no blocking findings in the inspected scoped source diff, including the static-contact correction. R1-R8 and new static-output finding R9 resolved at source level; fixture correction accepted.** Earlier root/backend evidence remains attributed below. **Fresh full root/static/browser gates for the static-tooling changes are pending parent completion; there is no publication/deployment approval or claim that GitHub Pages hosts auth.** Earlier evidence statements describe their respective snapshots.

## Evidence and ownership boundary

- Read repository `AGENTS.md` and `CLAUDE.md`. The required read of `/Users/donaldfilimon/AGENTS.md` was denied by the tool permission layer; no alternative access or permission bypass was attempted.
- Inspected login/signup routes and form, client/session helpers, auth server and route, redirect sanitizer, middleware/CSRF, provider configuration and verified-email provenance, admin admission, representative per-user functions, inquiry submission/receipts, contact/footer/privacy/security copy, and relevant regression/acceptance source.
- No production edits, builds, tests, servers, installs, Git writes, external requests, or credential reads were performed. This file is the only reviewer write.
- The initial Git status contained untracked finishing evidence and `package-lock.json`; these were left untouched. This is a live shared checkout, not a frozen source snapshot. Implementation activity was already observable during the review; final line references and dispositions must be refreshed.
- Existing tests and historical acceptance records are evidence of intended coverage, not new passing results. `bun run check`, static build/check/browser gates and server auth acceptance have **not been run by this reviewer**; their current exit codes are **not available in this phase**. Parent orchestration owns validation.

Severity: High = security boundary failure; Medium = functional/error-state correctness defect or unmet contact requirement; Low = recovery/feedback defect. All findings below are established from source unless expressly qualified. Browser exploit reproduction and interaction races remain unexecuted.

## Historical initial findings and implementer responses

The descriptions and line references in this section preserve the initial snapshot. The subsequent `fixed` statuses and responses were written by the implementer and are implementation claims, not reviewer approval. Independent current dispositions and refreshed references are below.

### R1: Redirect checks inspect raw text rather than the URL the browser will navigate to

- **Severity:** High
- **File:line:** `src/lib/internal.ts:51-64`; consumers: `src/routes/login.tsx:16-17`, `src/components/auth/login-form.tsx:58-59,87-97`.
- **Description:** `safeInternalPath` rejects literal `//` and `/\\`, but accepts a slash, an embedded TAB/LF/CR, then another slash. For example, the decoded `next` string `"/\t/attacker.example"` starts with `/`, does not start with `//` or `/\\`, contains no `://`, and passes every check. URL parsing removes embedded ASCII TAB/LF/CR, making this a protocol-relative off-origin target when passed to `window.location.assign`. A supplied login URL such as `/login?next=%2F%09%2Fattacker.example` therefore has a source-supported open-redirect path after email/passkey success or for an already signed-in visitor. This is a redirect/phishing risk, **not evidence of session-cookie disclosure**. OAuth callback validation is a separate Better Auth path and is not assumed bypassed.
- **Evidence:** All raw-string rejection conditions are visible at `internal.ts:52-63`; the returned unnormalized string reaches `window.location.assign`. `src/lib/internal.test.ts:10-26` covers literal external/backslash/API/login values, but not URL control characters or canonicalization. Browser reproduction was not run in this phase.
- **Suggestion:** Reject URL control characters/backslashes and validate a parsed, canonical destination against a fixed same-origin base before returning a path. Apply forbidden-route checks to its normalized pathname, not the raw input. Add regression cases for embedded TAB/LF/CR, encoded query forms, dot-segment normalization and safe ordinary paths; parent should verify no off-origin navigation in browser acceptance.
- **Status:** fixed
- **Response:** Reproduced URL-parser normalization locally: embedded TAB/LF redirects off-origin, and dot segments normalize into auth routes. `safeInternalPath` now rejects controls/backslashes, parses against a fixed same-origin base, rejects encoded path separators/controls and malformed encodings, and checks normalized/decoded pathnames for auth/API destinations. It returns a canonical internal path with query/fragment preserved. Regression coverage is in `src/lib/internal.test.ts`; compiled return-target cases were added to persistent acceptance. Parent-owned browser confirmation remains pending.

### R2: Public contact does not yet use the requested email/phone

- **Severity:** Medium
- **File:line:** `src/routes/contact.tsx:32,130-149,323-347`; related public copy: `src/lib/mlai/pages.ts:145-146,609,645`; global surface: `src/components/site/footer.tsx:52-60`.
- **Description:** Static contact drafts still target `partnerships@mlai-corp.com`. The direct-path panel provides only internal links, not the requested `cbkshadow@icloud.com` or `813-755-0156`. Careers, responsible-disclosure and privacy copy retain other `mlai-corp.com` addresses. Focused retrieval found no requested email/phone in the inspected source tree at initial review. This is a requirement gap, not a claim that the old mailboxes are invalid.
- **Evidence:** The static submit uses `INQUIRY_EMAIL` in its mailto, toast and lede. Server contact submission instead inserts an inquiry into the database (`src/lib/server/inquiries.server.ts:69-75`); changing a public mailbox does not make that path send mail.
- **Suggestion:** Use a small shared public-contact definition for the approved email, display phone and `tel:+18137550156`; propagate it to contact, appropriate global contact placement and intended public-copy addresses. Keep draft-requested/delivery-unconfirmed wording on Pages and site-accepted wording on the server. Parent should inspect generated pages and the actual intercepted mailto recipient after the implementer rebuilds; do not hand-edit `docs/`.
- **Status:** fixed
- **Response:** `site.contact` supplies the approved email, display phone and international telephone target. Contact drafts, contact/footer native anchors, careers/disclosure/privacy copy and publisher JSON-LD reuse it. The server path still reports database acceptance rather than mail delivery; static drafts remain delivery-unconfirmed. Rendered contact/footer/copy and structured-data tests cover source propagation. Generated-output review and actual mailto interception remain parent-owned.

### R3: `/signup` opens sign-in mode instead of account creation

- **Severity:** Medium
- **File:line:** `src/routes/signup.tsx:12-14`; `src/components/auth/login-form.tsx:39,73-80,132-134`.
- **Description:** On the server runtime, `/signup` navigates to `/login?next=/console`, whose form unconditionally initializes to `"signin"`. A newcomer following the signup URL sees a Sign in heading, no name field and a sign-in submit, rather than a creation form. They must discover and press the mode-toggle button before the signup endpoint is used. The static notice branch is intentional and is not the defect.
- **Evidence:** There is no mode carried by the signup redirect or login search schema. Existing backend signup acceptance explicitly visits `/login` and clicks `Need an account? Create one` (`e2e/backend/durable.acceptance.ts:130-141`), so it does not establish the `/signup` entry point works as signup.
- **Suggestion:** Make signup intent explicit in validated route state or share a form that accepts an initial mode. Preserve a sanitized destination when changing modes and add browser coverage starting at `/signup`, including initial heading/name/password autocomplete and successful account creation.
- **Status:** fixed
- **Response:** `/signup` now passes `mode=signup` to the validated login search, and the form follows that mode. Search-based toggling preserves return intent and form state. Unit rendering covers account-creation fields and autocomplete, ordinary signin, and static notices. Persistent acceptance now creates both independent users directly through the compiled `/signup` UI instead of API-only provisioning; that browser run is pending with the parent.

### R4: Optional local receipt failure leaves contact stuck after a real submission outcome

- **Severity:** Medium
- **File:line:** `src/routes/contact.tsx:145-149,174-179,299-305`; `src/lib/local-store.ts:12-14`.
- **Description:** `writeStore` calls `localStorage.setItem` without catching storage exceptions. Both static and server submit paths call it while status is `"saving"`, before setting status to `"done"`. A quota/security/storage-denial exception therefore rejects the submit handler and leaves the form disabled as Sending, even though the mailto was already requested or the server already accepted the inquiry. A reload/resubmit can duplicate an accepted inquiry, and the displayed pending state misrepresents the outcome.
- **Evidence:** The static mailto is dispatched at `contact.tsx:135` before the storage write. The server success branch has already received `result.ok` before the write at line 175. `submitContact` catches only the send operation (`src/lib/contact-context.ts:51-63`), not these later receipt writes. Existing contact tests exercise transport/validation failure, not storage failure after success.
- **Suggestion:** Make local receipts best-effort and separate storage failure from submission delivery/acceptance. Settle the submission status based on its actual result, retain an in-memory receipt when possible and state honestly when a device receipt cannot be saved. Parent should inject a throwing `setItem` for both static and server-success branches and confirm no stuck spinner, false failure or duplicate resend.
- **Status:** fixed
- **Response:** Both known-success branches use `saveContactReceipt`, which catches device-storage failures, retains the receipt in memory and returns settled `done` status without changing its draft/accepted evidence. The form distinguishes the actual outcome from whether a local copy persisted. Unit tests inject throwing `localStorage.setItem` for both delivery kinds and assert settled status, preserved receipt and honest wording. Persistent acceptance adds actual server-success storage denial, enabled submit and exactly one accepted inquiry. Browser execution remains pending; unrelated `writeStore` consumers were not changed.

### R5: Authentication actions have independent busy states and can compete

- **Severity:** Medium
- **File:line:** `src/components/auth/login-form.tsx:40,45-80,152,165,248,257-263`.
- **Description:** Email submission disables only its submit button via `formState.isSubmitting`; passkey/social controls disable only on `pending !== null`. The mode toggle remains enabled throughout. A pending email signup/signin can therefore overlap a passkey/social attempt, and an email submit can begin while a passkey assertion is outstanding. These operations share the same session cookie and redirect side effects, so completion order can select the effective session/navigation rather than the user's single intended action. Changing mode during an outstanding email request also changes the visible operation without cancelling the original one.
- **Evidence:** No shared busy guard exists at any of the three handler entries. All disabled conditions are local to their own action family. Actual overlapping-request behavior was not executed by this reviewer.
- **Suggestion:** Use one in-flight auth-operation guard across handlers and disable all conflicting method/mode controls during the attempt. On error, release it with a visible retry state. Parent should delay one request, try the alternate controls and confirm only one auth mutation/redirect occurs.
- **Status:** fixed
- **Response:** Email, passkey, social and mode-change handlers now share one synchronous in-flight ref guard, with conflicting controls disabled by shared busy state. Failure releases the guard; successful redirect attempts retain it through navigation. Email handler registration is deferred to the form event rather than passing the ref-closing callback during render, satisfying React Compiler lint without a suppression. The unit test invokes competing handlers before rerender, verifies one email call and no provider/passkey/mode action, then verifies retry after failure. Persistent acceptance holds an actual signin request and asserts disabled controls; parent execution is pending.

### R6: Failed sign-out is silently swallowed

- **Severity:** Low
- **File:line:** `src/lib/auth/gates.tsx:148-156`; `src/lib/auth/client.ts:42-45`.
- **Description:** The client correctly rejects an unsuccessful server sign-out instead of claiming the session was cleared. `UserButton`, however, catches the rejection only to reset `signingOut`, with no alert/toast/message. A visitor sees the menu return to normal and cannot tell the session is still active or why sign-out failed.
- **Evidence:** The catch callback contains only `setSigningOut(false)`. The underlying `signOut` helper throws on `error` and does not redirect in that case, which should be preserved.
- **Suggestion:** Surface a concise accessible sign-out failure while retaining the signed-in state and retry control. Parent should simulate a rejected sign-out and assert visible failure, no success navigation and successful retry.
- **Status:** fixed
- **Response:** Header `UserButton` and the profile device signout button now show an accessible inline alert after failure, preserve the signed-in state and enable retry. The underlying helper still navigates only after confirmed success. Client unit tests verify rejected signout does not navigate and successful retry does. Persistent acceptance injects 503 responses for both UI controls, verifies feedback/session retention and retries against the actual handler. That compiled browser proof remains parent-owned.

### R7: OAuth callback failure returns to a page that does not report the failure

- **Severity:** Low
- **File:line:** `src/lib/auth/client.ts:21-25`; `src/routes/login.tsx:11-17`; `src/components/auth/login-form.tsx:37-50,243-246`.
- **Description:** Provider initiation supplies `errorCallbackURL: "/login"`, but the login route/form reads only `next`. It has no interpretation or rendering of callback error state. The existing catch/toast covers a failure to start the provider request, not a provider callback rejection after full-page navigation. A cancelled or refused configured-provider login thus returns to an ordinary login form without explaining the failure; the intended destination is also absent from the error callback URL.
- **Evidence:** The error callback target is fixed at `/login`; search validation types only `next`; the sole inline root error comes from email `onSubmit`. No missing/unconfigured provider is being classified as defective.
- **Suggestion:** Preserve sanitized return intent in the error callback and map recognized auth callback failure codes to safe, user-readable feedback. Do not render arbitrary provider text as trusted HTML or expose raw sensitive error data. Parent can verify a local callback-error fixture without authorizing a live OAuth flow.
- **Status:** fixed
- **Response:** Provider initiation now uses a sanitized success destination and an error callback retaining that destination. Login validates callback error state into fixed cancelled/unverified/expired/generic feedback; arbitrary provider descriptions are not rendered. A provider initiation response without a redirect now rejects rather than leaving the caller pending indefinitely. Client/callback/render tests cover these contracts, and persistent acceptance includes a local error-query fixture. Live provider OAuth remains explicitly untested and unauthorized in this slice.

## Security/correctness invariants observed, not newly runtime-qualified

- **Static/server distinction:** `/login` avoids method discovery in static mode and shows `ServerOnlyNotice` (`src/routes/login.tsx:24-34`); `/signup` does likewise (`src/routes/signup.tsx:13`). `useCurrentUserState` returns null without invoking the session hook on Pages (`src/lib/auth/use-current-user.ts:58-63`), and static auth chrome renders a preview label (`src/components/site/auth-slot.tsx:9-19`). These notices are correct, not broken sign-in on GitHub Pages.
- **Origin and session ownership:** Client requests use same-origin Better Auth (`src/lib/auth/client.ts:9`). Server auth has explicit/dynamic loopback base URL and trusted origins (`src/lib/auth/server.ts:59-87`), host-prefixed secure cookies (`:183-196`), and disables cookie-cache authorization (`:126-129`). Protected session reads explicitly bypass cache (`src/lib/auth/verify.server.ts:53-60`). Alternate dev ports require matching origin configuration per repository guidance; cookie acceptance across hosts/browser engines still requires parent runtime evidence.
- **CSRF/isolation:** Start CSRF remains first and filtered to server functions (`src/start.ts:11,35-36`). Protected function middleware checks Fetch Metadata and obtains a server-verified id (`src/lib/auth/middleware.ts:23-31`); Better Auth endpoints use their own origin policy. Inquiry optional attribution also checks isolation (`src/lib/inquiries.ts:19-29`). Presence of these controls is not a new exploit-resistance test result.
- **Scoping/admin:** Profile and note operations use `context.userId`, including ownership in deletion (`src/lib/profile.ts:59-81`; `src/lib/workspace.ts:14-50`). Admin requires an allowlisted address plus matching-email durable evidence joined to a linked Google/Apple account, not a provider name or mutable emailVerified flag alone (`src/lib/server/admin.server.ts:31-59`). Inquiry listing rechecks admission on each call (`src/lib/console.server.ts:659-665`). Corresponding negative tests were inspected, not executed.
- **Contact delivery:** Pages explicitly distinguishes local drafts from confirmed delivery (`src/routes/contact.tsx:136-149,307-311`). Server contact validates/rate-limits/optionally verifies Turnstile before database acceptance (`src/lib/server/inquiries.server.ts:24-75`). No email delivery is implied by that database insert. Transport rejection preserves editable content through `submitContact` (`src/lib/contact-context.ts:50-63`), apart from the separate post-success storage defect R4.
- **Language-specific flags:** No Rust `unwrap()` or Rust clone/lock issue is applicable to these reviewed TypeScript paths. No speculative lock/style finding is raised.

## Required second phase before acceptance

1. Re-read the implementer's complete scoped diff and current files; update line references and mark each R1-R7 resolved/open/deferred with evidence. Verify approved contact values and link schemes propagate to source and regenerated output.
2. Parent supplies actual gate receipts and exit codes for the documented root gate and static acceptance, tied to the final source/artifact identity. Historical passing runs do not substitute for current acceptance.
3. Review parent-owned server browser proof: signup entry point, duplicate signup, wrong password, successful signin, sanitized return path, refresh/session identity, protected-route redirect and return, sign-out/retry, expired/revoked session refusal, independent-user scoping and password-only admin denial. Include form errors/loading and the targeted failure/race cases above.
4. Review parent-owned static proof: login/signup/protected surfaces remain honest server-only notices, no auth/server calls are attempted, mailto/phone destinations are correct, draft requests do not become delivered claims, and storage failure does not freeze the form.
5. Keep live OAuth, public persistent deployment, physical passkeys, external mail delivery and remote runtime configuration **unverified** unless explicitly authorized and supported by new evidence. No general runtime/config/cleanup research is delegated back to this reviewer.

**Initial disposition:** not approved for final closure. Source findings and intended invariants are recorded; implementation, fresh gates, generated-contact propagation and actual server/client acceptance remain pending parent continuation.

## Implementation Summary

Implementer follow-up, 2026-10-09: R1-R7 are fixed in source with regression coverage. These dispositions describe implementation, not independent reviewer approval or completed browser acceptance. The original review evidence and initial verdict above are preserved as historical observations.

Additional authorized narrow cleanup corrects the privacy hero's no-data claim and local-builder permissions claim, the founder's current ABI/WDBX language paragraph, existing publisher/feed identity to `site.company` (MLAI), and the obsolete five-minute session-cache warning. Evidence is the repository's configured account/inquiry/consent source, `sidecars/quasar-service/README.md` Pairing and transport section, `src/lib/mlai/categories/blog.ts` Rust migration record, and auth server's disabled cookie cache. Historical Zig articles and projects remain unchanged.

The compiled persistent acceptance source now includes direct signup for independent users; header/profile failed signout and retry; protected-route return intent; callback feedback without provider details; wrong-password then successful email login; delayed-request busy state; secure-session reload; unsafe return-path refusal; and accepted inquiry receipt-storage failure. Existing seeded notes/audit isolation, foreign-read/ciphertext refusal, Node restart and dump/restore assertions remain intact. It has not been executed by the implementer.

Fresh targeted check receipts and the complete changed-file inventory are recorded in `notes/verification/2026-10-09-finishing/contact-auth-implementation.md`. The parent owns the documented root gate, builds, static output, all Playwright/server/Postgres acceptance, final local-main commit and independent second-phase closure. No implementer commit/push/deployment or live provider call was performed.

## Prior independent follow-up against `2e76884114c5` (superseded by final re-review)

Reviewed all 24 tracked changed files reported by `git diff --name-only 2e768841`, including the complete changed source/test diff and full persistent acceptance source. Also read all six new source/test files absent from that tracked diff: `src/lib/auth/callback.ts`, `callback.test.ts`, `client.test.ts`, `email-password.test.ts`, `src/routes/auth-entry.test.tsx`, and `contact.test.tsx`. HEAD remained `2e76884114c5`; reviewed changes are in the live working tree, not an independently frozen artifact. Read-only retrieval/diff commands returned exit 0. No tests, builds, servers, installs, production edits, Git writes or external requests were performed by the reviewer.

The user authorizes a final **local-main commit only, no push**. That remains the parent's responsibility after corrections and gates; this reviewer did not stage or commit anything. No secrets or permission-denied worktrees were accessed. Original untracked evidence and npm lock remain outside this reviewer's writes.

### R1: Reopened: canonical pathname can become a protocol-relative redirect

- **Severity:** High
- **File:line:** `src/lib/internal.ts:51-74`; consumers: `src/routes/login.tsx:17-22`, `src/components/auth/login-form.tsx:65-66,99-100,113-115`.
- **Description:** The original embedded-control bypass is rejected, but the replacement validates the origin of a parsed URL and then returns only its pathname/search/hash. Dot-segment normalization can create a leading double slash in that pathname. The raw input `/docs/..//attacker.example` does not start with `//`, contains no forbidden controls/backslashes/encoded separators, and parses as a same-origin URL whose normalized pathname is `//attacker.example`. Its origin passes line 63 and none of the forbidden-route checks match. Returning that pathname at line 74 changes its interpretation: `window.location.assign("//attacker.example")` goes off-origin. `/.//attacker.example` and encoded-dot variants exercise the same boundary. Email, passkey and already-signed-in redirect paths remain exposed. No session-cookie disclosure is claimed. Provider initiation re-sanitizes separately and is not assumed equally exposed.
- **Evidence:** Raw prefix rejection precedes `new URL`; there is no equivalent rejection after normalization. Current unit tests cover ordinary dot segments and controls but not dot normalization that creates a protocol-relative returned value (`src/lib/internal.test.ts:35-68`). The authored persistent loop also lacks this case (`e2e/backend/persistent.acceptance.ts:506-509`). This is independently derived source/URL-semantics evidence; the reviewer ran no parser or browser reproduction.
- **Suggestion:** Validate the returned canonical string, not only the original input/initial URL. Reject a canonical pathname beginning with `//` and enforce that reparsing the returned target against the fixed origin cannot change origin. Add raw/encoded-dot double-slash regressions and parent-owned compiled redirect acceptance; retain existing controls and auth/API refusals.
- **Status:** **Reopened, blocking source approval.** Implementer's R1 `fixed` disposition is not accepted as complete.

### R2: Public contact propagation

- **Severity:** Medium (original finding)
- **File:line:** `src/lib/site-identity.ts:13-18`, `src/routes/contact.tsx:139-154,190-192,325-333`, `src/components/site/footer.tsx:58-68`, `src/lib/mlai/pages.ts:145-146,609,645`, `src/lib/mlai/structured-data.ts:32-38`.
- **Description/evidence:** Approved email, display phone and international dial target now have one small source in `site.contact`. Draft recipient, native contact/footer anchors, careers/disclosure/privacy copy and existing publisher JSON-LD reuse it. Focused retrieval finds no remaining production `mlai-corp.com` contact values; the old address appears only in a negative assertion. Server inquiries still mean database acceptance, not email delivery. Source/render/JSON-LD tests inspect these contracts.
- **Suggestion:** Parent must verify rebuilt `docs/`, native link destinations and an intercepted draft URI; source propagation is not publication or mail-delivery proof.
- **Status:** **Resolved in independently inspected source; generated output/browser proof pending.**

### R3: Signup entry point

- **Severity:** Medium (original finding)
- **File:line:** `src/routes/signup.tsx:12-14`, `src/routes/login.tsx:17-22`, `src/components/auth/login-form.tsx:38,85-92,152-153,208-218,255,285-299`, `src/routes/auth-entry.test.tsx:157-177`.
- **Description/evidence:** `/signup` passes validated `mode=signup`; the form derives mode from route search and shows creation fields/autocomplete. Search-based toggling retains sanitized return intent. Static notice remains unchanged. Compiled acceptance starts both contexts at `/signup`, uses actual form inputs and waits for signup response, `/console`, profile identity and secure cookies (`e2e/backend/persistent.acceptance.ts:362-410`).
- **Suggestion:** Parent must execute the authored journey; mocked SSR assertions do not establish navigation/hydration/session success.
- **Status:** **Resolved in independently inspected source; compiled UI qualification pending.**

### R4: Optional receipt storage failure

- **Severity:** Medium (original finding)
- **File:line:** `src/lib/contact-context.ts:50-76`, `src/routes/contact.tsx:114-118,153-154,179-181,309-312`, `src/lib/contact-context.test.ts:49-96`.
- **Description/evidence:** Both success branches call `saveContactReceipt`, which catches persistence errors, retains an in-memory receipt and settles `done` independently of delivery/acceptance. Tests inject throwing device storage for both draft/accepted kinds. Compiled acceptance checks real server acceptance after storage denial, enabled submit and one database row (`e2e/backend/persistent.acceptance.ts:514-543`). Unrelated storage consumers remain untouched.
- **Suggestion:** Keep this fix; parent must verify static/server interactions. R8 below is a different pending-edit loss, not failure of the storage catch.
- **Status:** **Resolved in independently inspected source; browser qualification pending.**

### R5: Competing auth attempts

- **Severity:** Medium (original finding)
- **File:line:** `src/components/auth/login-form.tsx:41-42,47-71,79-110,117,177,190,276,287-299`, `src/routes/auth-entry.test.tsx:129-155,179-193`.
- **Description/evidence:** All mutation handlers share a synchronous ref guard. Failure releases it; shared busy state disables competing method/mode controls. Direct-handler tests exercise overlap before rerender and retry. Compiled acceptance holds a real signin request, asserts email/passkey/mode controls disabled and releases it (`e2e/backend/persistent.acceptance.ts:455-479`). No lint suppression was added to claim this fix.
- **Suggestion:** Parent must execute the controlled-delay journey; live social credentials are not required for this source fix.
- **Status:** **Resolved in independently inspected source; real-interaction qualification pending.**

### R6: Visible failed sign-out and retry

- **Severity:** Low (original finding)
- **File:line:** `src/lib/auth/gates.tsx:149-166`, `src/routes/profile.tsx:128-153`, `src/lib/auth/client.ts:45-48`, `src/lib/auth/client.test.ts:15-24`.
- **Description/evidence:** Header/profile controls render accessible failure feedback and enable retry. The helper still rejects before navigation on server error. Compiled acceptance injects 503 for each UI control, checks session retention/no success navigation, removes the fixture and retries the real handler (`e2e/backend/persistent.acceptance.ts:411-438,493-505`).
- **Suggestion:** Parent must verify actual menu/alert behavior and cookie clearing during execution.
- **Status:** **Resolved in independently inspected source; browser failure/retry proof pending.**

### R7: Safe callback feedback and retained destination

- **Severity:** Low (original finding)
- **File:line:** `src/lib/auth/callback.ts:5-24`, `src/lib/auth/client.ts:22-30`, `src/routes/login.tsx:17-22`, `src/components/auth/login-form.tsx:159-163`.
- **Description/evidence:** Default error callback retains a sanitized destination; callback codes map to fixed messages without rendering raw provider descriptions. Initiation lacking a redirect URL rejects. Tests inspect callback construction/mapping and dispatch. Compiled acceptance uses a local error-query fixture, not a live OAuth handshake (`e2e/backend/persistent.acceptance.ts:440-447`).
- **Suggestion:** Keep fixture evidence separate from live-provider acceptance, and retain safe destinations including the R1 correction.
- **Status:** **Resolved in independently inspected source; callback UI qualification/live OAuth remain separate.**

### R8: Pending contact success clears text entered after submission

- **Severity:** Medium
- **File:line:** `src/routes/contact.tsx:157-160,179-180,256-267,298-307`.
- **Description:** Server-mode submit snapshots message A and awaits `submitContact`. Only its submit button is disabled; the controlled message input stays editable. If the visitor edits to B while the request is pending, success records only A and unconditionally calls `setMessage("")`, deleting B even though it was never sent/saved. The receipt contains A, so B cannot be recovered from it. This is an existing path newly identified in final review, not a claim the receipt-storage patch introduced it.
- **Evidence:** Textarea has no read-only/disabled protection while `saving`; `onChange` updates message state; the async success continuation clears it unconditionally. The new compiled receipt case makes no pending-request edits (`e2e/backend/persistent.acceptance.ts:514-543`). No delayed-request runtime reproduction was performed by this reviewer.
- **Suggestion:** Either freeze editing during submission or clear only a still-matching submitted snapshot, retaining newer edits. Add controlled-delay success coverage that submits A, edits B before response and verifies B remains or editing is explicitly blocked. Preserve failure-path contents and honest receipt outcomes.
- **Status:** **Open, blocking requested form-correctness closure.**

### Narrow copy cleanup and invariant review

- Publisher/feed identity references existing `site.company` (MLAI), without inventing a corporate identity (`src/lib/mlai/structured-data.ts:32-38`, `src/lib/mlai/feed.ts:98`). Source tests check changed identity/contact values.
- Founder language paragraph follows this site's existing Rust/sibling-workspace migration record (`src/lib/mlai/categories/team.ts:80`; `src/lib/mlai/categories/blog.ts:7-31`). No sibling checkout or unrelated historical article was edited/freshly qualified.
- Privacy admits local data and configured account/inquiry/audit storage, plus labelled snapshot fallback (`src/routes/privacy.tsx:20-29`). Local-builder permission copy matches documented pairing/loopback/transport limitations (`src/routes/privacy.tsx:79-80`; `sidecars/quasar-service/README.md:78-104`; `sidecars/quasar-service/src/security.ts:56-78`). It does not claim pairing is an OS sandbox or provisioned TLS. No blocker found in this narrow copy diff.
- Revocation wording agrees with disabled cookie cache (`src/components/profile/sessions-card.tsx:97-99`; `src/lib/auth/server.ts:126-129`). Focused diff for auth server, verified-session helper, admin admission, Start CSRF, note ownership and console server logic is empty against baseline. No weakening of these controls in this slice.
- Static notice/method-discovery branches stay distinct from server auth. Unconfigured provider buttons remain filtered, not bugs. No provider credentials demanded by this review.

### Authored acceptance assessment and remaining evidence

Full persistent acceptance source was reviewed. The journey is meaningfully strengthened from API-only provisioning to compiled signup/signin/profile/session UI. Original owned-resource guards, loopback TLS proxy, independent contexts, migration refusal, foreign-audit replay, transplanted-ciphertext refusal, restart and seeded dump/restore assertions are retained. Local network-error and storage fixtures do not substitute for real success handlers or weaken production checks. Synthetic callback feedback is labelled. **No browser pass is asserted.**

Before final acceptance/local commit, parent must:

1. Have the implementer correct R1/R8, add regressions and return the exact scoped diff for independent re-review. Extend compiled return cases to normalized-leading-double-slash targets.
2. Finish/re-run the documented root gate after corrections and supply actual exit codes tied to final source identity. The currently running parent gate is not deemed passed here; targeted implementer receipts are not full-gate/browser approval.
3. Qualify the final persistent artifact serially, supplying its tree hash and actual acceptance exit code. Review the authored UI cases plus existing negative admin/scoping/expiry/revocation coverage. This persistent journey alone does not add duplicate signup, live OAuth or all admin denial checks.
4. Rebuild static output, run checker/browser acceptance and verify approved contact propagation, mail/tel schemes, intercepted draft recipient, no auth/server calls on static notice routes and storage-failure settlement. Current generated output was not independently rebuilt or qualified here.
5. Keep public deployment, external delivery, real OAuth, physical authenticators and remote readiness unqualified without separately authorized evidence. Source approval, local gates and deployment approval are different claims.

**Prior follow-up disposition:** **Changes requested.** R2-R7 and narrow copy cleanup were accepted at source level; R1 and R8 were blockers in that inspected snapshot. This disposition is superseded by the final correction re-review below. The source findings remain preserved as review history, not current open defects.

## Final correction re-review: SOURCE Approved

Independent re-read of the current R1/R8 source and tests, persistent acceptance changes, public-renderer regression, and existing scoped auth/receipt source diff against `2e76884114c5`. Read-only Git reported HEAD **`4d2d028c0a9f`**, changed since the earlier review, with additional working-tree changes present. This approval applies to the inspected baseline-to-current **source diff**, not to a frozen compiled output or an assumed final commit. Generated `docs/` and preserved evidence also appear in the checkout diff; no generated-output acceptance or ownership inference is made here. The reviewer made no Git/source writes and did not run tests, builds, servers or installs.

### R1: Independently resolved after canonical-target correction

- **Severity:** High (historical finding)
- **File:line:** `src/lib/internal.ts:51-81`; regressions: `src/lib/internal.test.ts:72-92`; compiled journey: `e2e/backend/persistent.acceptance.ts:506-516`.
- **Description/evidence:** The parser now rejects a normalized pathname starting with `//` at line 63, before returning anything. It then constructs the exact pathname/search/hash target and reparses that exact string against the fixed origin at lines 74-78. Thus the reviewed dot-segment/double-slash case cannot change origin merely because the absolute origin was removed. Raw controls/backslashes, encoded separators/controls, malformed encodings and normalized auth/API destinations remain rejected. Ordinary query/fragment intent is preserved.
- **Regression assessment:** Tests explicitly include raw and uppercase/lowercase encoded-dot variants, multiple leading normalized slashes and the same-base-host `//quesar.cloud` case. The latter is rejected by pathname shape even when reparsed origin alone would match. An internal path containing a non-leading doubled slash remains allowed. Compiled return-path cases now include the raw/encoded-dot variants that were missing from the prior review.
- **Suggestion:** Preserve both canonical-prefix and exact-return-target invariants. Parent should execute these authored unit/browser checks and retain actual exit codes/artifact identity; no reviewer runtime reproduction was performed.
- **Status:** **Resolved in independently inspected source. No remaining R1 source blocker; actual compiled/browser proof pending.**

### R8: Independently resolved by freezing pending form edits

- **Severity:** Medium (historical finding)
- **File:line:** `src/routes/contact.tsx:121-127,157-181,203,217,232,244-245,260-262,303-306`; regressions: `src/routes/contact.test.tsx:42-54`; compiled journey: `e2e/backend/persistent.acceptance.ts:521-583`.
- **Description/evidence:** Name, email, service context, topic radio group and message are now disabled while `status === "saving"`; the submit handler also refuses while saving. The radio wrapper forwards `disabled` to its primitive root (`src/components/ui/radio-group.tsx:5-9`). New user text cannot be entered through these pending controls and then silently erased by the existing success clear. Error settlement re-enables the fields without clearing their contents; success settles honestly through the existing optional receipt-persistence helper. The correction did not make local storage mandatory or turn database acceptance into mail-delivery proof.
- **Regression assessment:** The renderer test checks enabled and disabled markup for all four text fields and every rendered radio. Compiled acceptance holds the actual inquiry request, waits until it is observed, asserts all named fields and the radio disabled/message non-editable with unchanged submitted text, then releases the request in a `finally`-protected fixture. After real server acceptance it checks editable/empty message, optional-storage failure wording, exactly one inquiry row and exact persisted submitted text. Route interception is removed; no fake success response substitutes for the server.
- **Suggestion:** Parent should execute the delayed-request acceptance, retaining the failure case and optional-storage cases. Authoring assertions and checking their source is not evidence they passed in a browser.
- **Status:** **Resolved in independently inspected source. No remaining R8 source blocker; actual delayed-request browser/Postgres proof pending.**

### No additional blocking source findings

R2-R7 remain accepted at source level with the evidence in the prior follow-up. The current auth handler/busy guard, signup mode, callback feedback, signout recovery and optional receipt code retain those fixes. Focused diff for auth server, authoritative session verification, admin admission, Start CSRF, note ownership and console server logic is still empty against baseline. No weakening of those controls, requirement for unconfigured OAuth credentials, or new production-copy blocker was identified.

The public-renderer assertion now expects the actual conditional local-receipt wording and adds an explicit negative check against delivered-email/inquiry claims (`src/routes/-public-renderer.test.tsx:94-109`). It retains the configured-server acceptance and static draft distinctions, rather than deleting the claim-boundary test. The reported 85 targeted passing tests are **parent/implementer-reported**, not independently executed or adopted as full-gate/backend evidence by this review.

### Remaining qualification at the source-approval snapshot (historical)

1. **Root gate:** Parent's `bun run check` is reported running. Completion/actual exit code and final source identity have not been supplied as verified evidence in this phase. No green-gate claim here.
2. **Backend:** Persistent artifact build, exact artifact hash and executed browser/Postgres acceptance remain pending. Source approval does not establish that signup/signin/session/navigation/recovery or the held inquiry work at runtime. Keep existing independent-user/admin/expiry/revocation checks distinct from the authored UI journey's coverage.
3. **Static:** Verify the final regenerated pages/checker/browser results, approved mail/tel propagation, intercepted draft recipient and absence of auth/server calls on static notice surfaces. Dirty generated output alone is not successful static qualification or public publication.
4. **External behavior:** No new real OAuth, external mail delivery, physical authenticator, public TLS/deployment or remote readiness evidence was reviewed; these remain unqualified. None is required merely to accept this narrow source correction.
5. **Local main:** User authorizes completion and a local-main commit only, no push. The parent owns final validation, preservation/staging of intended work and commit reporting. This reviewer did not stage, commit, push or deploy. Changes after this source snapshot require scope-appropriate re-review/qualification.

**Source-approval snapshot disposition:** Approved, no blocking findings. R1-R8 resolved in inspected source. Backend/static qualification was pending at that point; subsequent parent-reported backend evidence is recorded below.

## Final fixture/evidence follow-up

Date: 2026-10-09. Read-only Git now reports HEAD **`0349748ef1a6`**, advanced since the previous observed `4d2d028c0a9f`. Reviewed the baseline-to-current scoped source inventory and the source delta since `4d2d028c0a9f`, plus the current team narrative and actual fixture code. No source/Git writes or validation commands were performed by this reviewer. The assigned review Markdown remains the only reviewer write. Read-only diff commands returned exit 0.

### Persistent fixture correction: accepted

- **Severity:** No new defect; reviewed correction to a parent-reported failing fixture.
- **File:line:** `e2e/backend/persistent.acceptance.ts:476-480,534-565`; retained context network guard: `:354-359`.
- **Description/evidence:** After releasing the held signin request, the fixture now drains active page routing callbacks with `page.unrouteAll({ behavior: "wait" })`, instead of merely removing the named route. The held inquiry fixture additionally signals entry from within its callback and awaits that barrier before testing disabled controls. Its `finally` releases the hold and waits for active page handlers to drain. The browser-context same-origin network guard remains installed; removing page routes does not remove that context policy. No production auth/contact code was changed to accommodate the failure.
- **Assertion review:** Busy controls, secure-session reload, malformed return-target refusal, exact accepted inquiry count/text, optional-storage warning, foreign-audit refusal, ciphertext binding, restart and restore assertions remain. The fixture continues actual handlers for success; only deliberately injected failure responses are synthetic. No assertion deletion, fake successful response, timeout increase or auth/admin relaxation was found in this correction.
- **Suggestion:** Retain the first failed-run receipt and final passing-run receipt separately. The correction fixes fixture lifecycle/evidence collection, not a demonstrated production session defect.
- **Status:** **Accepted independently at source level; parent reports actual successful execution after correction.**

### Current diff/narrative disposition

- The baseline-to-current source inventory still consists of the reviewed auth/contact/copy/acceptance changes. The delta since `4d2d028c0a9f` contains the already-reviewed R1/R8 regressions and fixes, public-renderer wording assertion and fixture refinement, not an unexpected new production subsystem.
- Current `src/lib/mlai/categories/team.ts:80` still distinguishes nightly-Rust current ABI/sibling WDBX from historical Zig guidance. Its baseline diff is the reviewed paragraph replacement. No additional unreviewed team narrative change was found in the inspected current file.
- Focused baseline diff for auth server, authoritative verification, admin decision, Start CSRF, scoped notes and console server logic remains empty. **No new blocking source finding or unexpected scoped-diff concern identified.** HEAD advancement is disclosed; no ownership or final-artifact identity is inferred from HEAD alone.

### Qualification evidence and provenance

**Root gate: directly inspected saved parent output.** `/Users/donaldfilimon/.local/share/opencode/tool-output/tool_122794c12001PfJn61jf4hVZyU` records the ordered `format:check && typecheck && lint && test && build` command. Lines 1-17 show formatting success, typecheck/lint invocation and **102 test files / 819 tests passed**. Lines 1408-1412 show completed build and Nitro output. Parent reports the full gate green. The saved text includes bundler warnings; it is not a warning-free-build claim. This reviewer did not rerun the gate. Numeric process-exit metadata is not included in the saved text inspected; the successful command outcome is parent-reported and the retained controller metadata remains authoritative.

**Sidecar: parent-reported executed result.** Typecheck and **113 tests / 486 expectations green**. No sidecar mutation appears in the scoped source inventory, and the reviewer did not independently rerun or retrieve a new sidecar receipt. This is attributed execution evidence, not an invented reviewer result.

**Persistent build/artifact: parent-reported successful build.** Reported full output-tree SHA256:

`5a503b65d7e6b572ae207a1cfc495d44e83bd9482164ec964699d649c2b50626`

The reviewer did not recalculate this hash or inspect a new compiled tree. It identifies the parent's qualified artifact, not the static `docs/` tree.

**Persistent browser/Postgres acceptance: parent-reported actual execution, accepted with explicit provenance.** Final rerun: **PASS, 1 scenario, 45.3 seconds**. Reported coverage matches the reviewed executable assertions: compiled UI signup in independent contexts; header/profile signout failure and real-handler retry; wrong password then successful signin; busy controls; secure session reload; normalized redirect refusal; held-contact edit freeze and local-storage failure with exactly one stored inquiry and exact submitted text; scoped notes/audits; foreign read/ciphertext refusal and successful owner decryption; process restart; and **15-table** seeded PostgreSQL dump/restore verification. This is local compiled runtime evidence, not merely authored tests. No final raw acceptance log or numeric exit metadata was supplied for direct reviewer inspection in this turn; scenario result, duration, artifact hash and table count are explicitly parent-reported, not independently rerun measurements.

**Earlier failed run remains disclosed.** Parent reports the first actual persistent run failed on a route-handler lifecycle race after the UI/contact receipts. The reviewed fix is limited to fixture drain and entry synchronization. That run does not become a complete pass merely because some earlier receipts succeeded. The subsequent full passing rerun is the qualifying reported result; preserve both receipts in the final integration record.

### Remaining boundary and exact verdict

1. **Static acceptance pending:** Parent reports static build/browser work running. No current static success/exit code is asserted here. Final generated-page contact links/draft recipient, server-only notices, checker and browser outcomes must still be recorded by the parent.
2. **GitHub Pages cannot host these auth endpoints:** This site's static build deliberately renders server-only notices for signup/signin/protected features and makes contact a draft request. The local compiled backend proof does **not** mean signup/signin is available on the public Pages deployment. Hosting live auth requires a separately configured persistent server origin/deployment; no deployment is authorized or claimed here.
3. **Live external flows remain separate:** Synthetic callback error feedback, local TLS and a disposable Postgres scenario do not prove real provider OAuth, physical passkeys, remote TLS/operations or external mail delivery. No missing OAuth credentials are classified as bugs.
4. **Local-main commit only:** Parent owns final static qualification, preservation/staging and the user-authorized local commit. No push. Reviewer made no commit, source change, server launch, build or test run. Preserve numerical command exit receipts and exact artifact/source identities in the parent's completion record.

**Final independent verdict: SOURCE Approved, no blocking findings. Fixture correction accepted. Reported local compiled backend qualification is recorded and consistent with reviewed assertions, with the failed predecessor disclosed. Public static qualification remains pending; public hosted auth/deployment and external-provider behavior are not qualified by this review.**

## Static-contact output correction: independent SOURCE Approved

Date: 2026-10-09. Current read-only HEAD observation: **`4ab275be56c1`**, with the new static scripts/config changes in the working tree. Read `notes/verification/2026-10-09-static-contact-report.md`, all seven changed/new source-test files, and the installed prerenderer's relevant implementation. Also checked canonical contact/service links, route search handling, all four Quasar route declarations, router ignore-prefix configuration, Vitest inclusion, sitemap/404 generation and the scoped gate diffs. No tests/builds/servers/Git writes or production edits were performed. Only this assigned review file was updated; the implementer's report/code and preserved failure evidence were not modified.

### R9: Blank contact document and duplicate prerender output writers

- **Severity:** Medium (demonstrated functional delivery defect)
- **File:line:** Configuration correction: `vite.config.ts:104-122`, `scripts/static-prerender-path.ts:1-9`; output guards: `scripts/check-static.ts:38-49,144-145`, `scripts/publish-static.ts:48-58`.
- **Description/evidence:** Parent reports the full static browser run failed **17 cases / 209 passed**, with a zero-byte contact document and preserved direct HTTP 416 response. The implementer report records both source prerender output and published contact HTML as empty before hydration and records the failed trace location. These are attributed observed results, not reviewer reruns. The installed prerender source independently confirms that task deduplication uses the complete `page.path` (`node_modules/@tanstack/start-plugin-core/src/prerender.ts:113-128`), while output naming strips query/fragment (`:161-195`) and writes the shared file (`:208-212`). `/contact` and service-query variants therefore can be separate writers of the same HTML file. The exact filesystem interleaving that produced the empty file was not captured; it is not promoted to a directly observed syscall trace.
- **Correction review:** The static-only filter rejects query/fragment variants before task queueing while retaining canonical paths and the existing media/API/server-function exclusions. Empty/whitespace HTML now fails the static checker even without missing links/assets. Publisher validation runs over source HTML before `rmSync(docs)`, so this refusal preserves the existing published tree. Regression fixtures check blank/whitespace output, allowed/disallowed paths and preservation on publication refusal (`scripts/static-prerender-path.test.ts:4-18`, `scripts/check-static.test.ts:41-46`, `scripts/publish-static.test.ts:12-34`). No hand-authored fake contact HTML or weakened component assertion is involved.
- **Suggestion:** Keep the single-canonical-document crawl policy and both failure guards. Parent must complete the fresh broad gate/checker/browser run and retain failed and passing artifacts separately. The new preflight protects against empty-source-HTML refusal; it is not a claim that every later publisher/filesystem failure is transactional.
- **Status:** **Resolved in independently inspected source. Static-fix SOURCE Approved; final broad static acceptance pending.**

### Route coverage and static Quasar semantics

- **Canonical contact is retained:** `staticPrerenderPath("/contact")` is allowed, auto static-path discovery is left enabled, and plain canonical links still exist in navigation/search/service pages (`src/lib/site-identity.ts:35`, `src/lib/search-pages.ts:75`, `src/routes/services.tsx:88,96`). This is not a filter that drops contact entirely.
- **Client search state is retained:** Service links still navigate to `/contact` with service search state (`src/routes/services.tsx:58-64`). Route validation and component search reads/prefill remain intact (`src/routes/contact.tsx:34-58`; `src/lib/contact-context.ts:3-7`). Query variants use the canonical document and resolve URL search in the client; no query/link rewriting or contact UI change was made by this slice. Fragment anchor checking remains in `check-static.ts:107-109`; declining fragment-only prerender jobs does not remove anchor validation.
- **No valid 404 route was removed:** `/404` is not an application route. Only that nonexistent prerender seed was removed; publisher's independent `404.html` creation remains (`scripts/publish-static.ts:82-111`), with its noindex behavior. Feed, signup and unauthorized seeds remain explicitly present (`vite.config.ts:116-122`).
- **Quasar remains browser-to-local-service:** `/quasar/new`, `/quasar/sites` and `/quasar/settings` are allowed canonical paths; their `ssr: false` declarations remain (`src/routes/quasar.new.tsx:5-13`, `quasar.sites.tsx:5-13`, `quasar.settings.tsx:5-13`). Dynamic `/quasar/site/$id` continues reading its id in the browser and using the keyed local-service detail component (`src/routes/quasar.site.$id.tsx:5-19`). No new server fetch, hosted generation claim, broad `/quasar/*` exclusion or pairing/auth change was added. No present canonical-route loss or changed Quasar static semantics was identified.
- **Test-route hygiene:** Renamed `-auth-entry.test.tsx` and `-contact.test.tsx` follow the installed router's default `'-'` ignore prefix (`node_modules/@tanstack/router-generator/src/config.ts:26`). Current generated route tree contains one `/contact` and no test imports. Vitest still includes `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts` (`vitest.config.ts:8-17`), so the renames prevent application-route discovery without removing unit coverage.

### No broad-gate weakening found

`failOnError: true`, link crawling and canonical-path discovery remain enabled in the static config. Initial JS/preload budgets, media byte comparison, internal page/anchor/asset validation and search destination checks remain unchanged; the checker adds a refusal rather than excluding failures. Package/Playwright/Vitest gate configuration has no new diff in this slice. The pending persistent-fixture delta is the previously reviewed route-drain correction, not a static-browser assertion change. The report preserves the earlier external output replacement/media mismatch and does not claim that timeout changes or poster edits cured contact. No new blocking source finding was identified.

### Evidence status and completion boundary

- **Inspected implementer report, attributed focused results:** 10 targeted tests in 3 files, typecheck, scoped lint/format, corrected static build and checker are reported exit **0**. Checker reports **129 HTML files**; focused unchanged contact/service/browser cases report **20/20 passed, exit 0**. The report also attributes HTTP 200 / 25,548-byte responses for plain/known/unknown-query contact requests with canonical document SHA256 `21629c6d131f87069feb7da82a334295b821adbf98656c9bbfdb1e4eeb74b572`. Reviewer inspected the report and code, not a new runtime run; these counts/hash/exits are implementer-reported.
- **Failed predecessor stays failed:** Parent's earlier **17 failed / 209 passed** suite and zero-byte/416 trace remain disclosed. Focused 20-case success does not substitute for the entire browser suite, and subsequent external output replacement does not retroactively qualify that failing artifact.
- **Fresh broad gates pending:** Parent reports the full root gate, static checker and full browser run now running. This review asserts no final fresh-gate exit code or 226-case browser pass. Prior root/backend results above predate this static-tooling correction and are not relabelled as qualification of its final source/output.
- **Public boundary unchanged:** GitHub Pages still has no Better Auth runtime; signup/signin/protected pages intentionally display server-only notices. Quasar browser pairing/local-service behavior is separate from website auth. Contact mailto remains a draft request, not confirmed delivery. No push, deployment, live OAuth or external message was authorized/performed by this reviewer.

**Latest independent verdict: Approved SOURCE for the static-contact fix, no blocking findings. R9 is source-resolved without route loss, altered Quasar static semantics or weakened broad gates in the inspected changes. Parent owns fresh full qualification and the user-authorized local-main commit only; no push.**
