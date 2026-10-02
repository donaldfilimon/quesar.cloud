# Site completion inventory — 2026-10-01

Status: **Partial**. This is a source inspection baseline for the approved services-led client/partner site, six cinematic rooms, narrated exports, and staged backend release. It does not certify deployment or passing gates. No tests or builds were run for this inventory; source availability is evidence of implementation, not runtime acceptance. Other agents are changing this shared checkout; findings describe files read during this pass and must be reconciled with their final diff.

## Acceptance contract

Public acceptance requires a coherent services/client/partner journey from home to service scope, proof, and contact; accurate capability statuses; working direct links/search; keyboard and screen reader access; mobile, desktop, light/dark and reduced-motion behavior; legal/contact consistency; current source attribution; root gate plus static build, static audit and browser suite. Backend acceptance additionally requires an isolated staging deployment with durable database, configured signing/encryption/origin, tested migrations, cross-user authorization, provider round trips, retention/deletion, and recovery evidence before production cutover. Public movie acceptance requires reproducible complete narrated exports with captions/transcripts, verified duration/audio/video playback, downloads/posters, and honest VISION/ROADMAP labels.

## Every page route

Dynamic placeholders below denote route families: every typed record slug must be checked, not only a representative. Paths are extracted from current route declarations; generated routeTree is not edited.

| Route | Current source evidence | Required acceptance / dependency |
|---|---|---|
| `/abbey-bot` | `src/routes/abbey-bot.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/abbey` | `src/routes/abbey.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/abi` | `src/routes/abi.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/about` | `src/routes/about.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/admin` | `src/routes/admin.tsx` | Session gate implemented; static notice; staging session/authorization/persistence journey required. |
| `/apps` | `src/routes/apps.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/architecture` | `src/routes/architecture.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/benchmarks` | `src/routes/benchmarks.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/blog/$slug` | `src/routes/blog.$slug.tsx` | Typed detail family; valid/missing slug, every record link, assets and provenance required. |
| `/blog` | `src/routes/blog.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/cell-machine` | `src/routes/cell-machine.tsx` | Interactive demo/tool; loading/error/empty/reduced-motion/accessibility and honest local/model distinction required. |
| `/changelog` | `src/routes/changelog.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/companion` | `src/routes/companion.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/company` | `src/routes/company.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/console` | `src/routes/console.tsx` | Session gate implemented; static notice; staging session/authorization/persistence journey required. |
| `/console/workspace` | `src/routes/console.workspace.tsx` | Session gate implemented; static notice; staging session/authorization/persistence journey required. |
| `/contact` | `src/routes/contact.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/dashboard` | `src/routes/dashboard.tsx` | Session gate implemented; static notice; staging session/authorization/persistence journey required. |
| `/demo` | `src/routes/demo.tsx` | Interactive demo/tool; loading/error/empty/reduced-motion/accessibility and honest local/model distinction required. |
| `/developers` | `src/routes/developers.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/docs/$slug` | `src/routes/docs.$slug.tsx` | Typed detail family; valid/missing slug, every record link, assets and provenance required. |
| `/docs` | `src/routes/docs.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/financial-model` | `src/routes/financial-model.tsx` | Interactive demo/tool; loading/error/empty/reduced-motion/accessibility and honest local/model distinction required. |
| `/gama` | `src/routes/gama.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/get-started` | `src/routes/get-started.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/` | `src/routes/index.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/investors` | `src/routes/investors.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/links` | `src/routes/links.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/login` | `src/routes/login.tsx` | Server auth form; static disabled state; successful/failed sign-in, passkeys, redirect/logout/recovery required. |
| `/mobile` | `src/routes/mobile.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/platform` | `src/routes/platform.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/plugins` | `src/routes/plugins.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/privacy` | `src/routes/privacy.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/products/$slug` | `src/routes/products.$slug.tsx` | Typed detail family; valid/missing slug, every record link, assets and provenance required. |
| `/products` | `src/routes/products.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/profile` | `src/routes/profile.tsx` | Session gate implemented; static notice; staging session/authorization/persistence journey required. |
| `/projects/$slug` | `src/routes/projects.$slug.tsx` | Typed detail family; valid/missing slug, every record link, assets and provenance required. |
| `/projects` | `src/routes/projects.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/quasar/new` | `src/routes/quasar.new.tsx` | Browser-to-local-service screen; configured service, secured trust boundary, create/edit/events/preview/delete required. |
| `/quasar/settings` | `src/routes/quasar.settings.tsx` | Browser-to-local-service screen; configured service, secured trust boundary, create/edit/events/preview/delete required. |
| `/quasar/site/$id` | `src/routes/quasar.site.$id.tsx` | Browser-to-local-service screen; configured service, secured trust boundary, create/edit/events/preview/delete required. |
| `/quasar/sites` | `src/routes/quasar.sites.tsx` | Browser-to-local-service screen; configured service, secured trust boundary, create/edit/events/preview/delete required. |
| `/quesar` | `src/routes/quesar.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/research/$slug` | `src/routes/research.$slug.tsx` | Typed detail family; valid/missing slug, every record link, assets and provenance required. |
| `/research/implementations/$slug` | `src/routes/research.implementations.$slug.tsx` | Typed detail family; valid/missing slug, every record link, assets and provenance required. |
| `/research/implementations` | `src/routes/research.implementations.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/research` | `src/routes/research.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/security` | `src/routes/security.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/services` | `src/routes/services.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/showcase/abbey` | `src/routes/showcase.abbey.tsx` | Client-only lazy room; full playback/exit/failure/accessibility and narrated export required (see room table). |
| `/showcase/design` | `src/routes/showcase.design.tsx` | Client-only lazy room; full playback/exit/failure/accessibility and narrated export required (see room table). |
| `/showcase/explainer` | `src/routes/showcase.explainer.tsx` | Client-only lazy room; full playback/exit/failure/accessibility and narrated export required (see room table). |
| `/showcase/film` | `src/routes/showcase.film.tsx` | Client-only lazy room; full playback/exit/failure/accessibility and narrated export required (see room table). |
| `/showcase/mega` | `src/routes/showcase.mega.tsx` | Client-only lazy room; full playback/exit/failure/accessibility and narrated export required (see room table). |
| `/showcase/trailer` | `src/routes/showcase.trailer.tsx` | Client-only lazy room; full playback/exit/failure/accessibility and narrated export required (see room table). |
| `/showcase` | `src/routes/showcase.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/signup` | `src/routes/signup.tsx` | Server auth form; static disabled state; successful/failed sign-in, passkeys, redirect/logout/recovery required. |
| `/skill-creator` | `src/routes/skill-creator.tsx` | Interactive demo/tool; loading/error/empty/reduced-motion/accessibility and honest local/model distinction required. |
| `/source/$name` | `src/routes/source.$name.tsx` | Typed detail family; valid/missing slug, every record link, assets and provenance required. |
| `/source` | `src/routes/source.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/team/$slug` | `src/routes/team.$slug.tsx` | Typed detail family; valid/missing slug, every record link, assets and provenance required. |
| `/team` | `src/routes/team.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/terms` | `src/routes/terms.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/tf-pose-demo` | `src/routes/tf-pose-demo.tsx` | Interactive demo/tool; loading/error/empty/reduced-motion/accessibility and honest local/model distinction required. |
| `/unauthorized` | `src/routes/unauthorized.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/wdbx` | `src/routes/wdbx.tsx` | Public page implemented; services-led discovery, claims review, links/SEO/accessibility/static/browser acceptance required. |
| `/workspace` | `src/routes/workspace.tsx` | Interactive demo/tool; loading/error/empty/reduced-motion/accessibility and honest local/model distinction required. |

`src/routes/__root.tsx` additionally owns canonical metadata, global navigation/layout, not-found handling, and default error integration. Verify unknown URL, root failure, lazy import retry, navigation focus, overlay escape, theme persistence, and outbound link semantics.

## HTTP endpoints and authenticated journeys

| Surface | Current evidence | Required acceptance / dependencies |
|---|---|---|
| `/feed.xml` | `src/routes/feed[.]xml.ts`, RSS builder | XML validity, links/dates and static/server delivery. |
| `/api/auth/*` | Better Auth handler; email/password, passkey, configured Google/Apple/X | Durable DB; stable secret; configured origin; provider callbacks; session revocation/logout; account-link identity binding; no wrong-user disclosure. |
| `/api/workspace/connect/$provider`, `/callback/$provider`, `/disconnect/$provider`, `/connections`, `/drive`, `/sharepoint` | Own OAuth handlers and sealed token modules | Google/Microsoft credentials, encryption; state/callback binding; denied consent/reconnect/expired token; cross-user refusal; provider revoke proof. |
| `/api/cron/audits-expire` | Cron endpoint and secret gate | Secret plus real scheduler, expiry boundary, durable deletion/access-log evidence. |
| `/api/telemetry`, `/api/csp-report` | Validated public reporting handlers | Body limits, rate limits, no sensitive payload logging, persisted summary/admin access; CSP enforcement decision. |
| Profile | User update, billing and account-deletion hook | Name persistence, passkey registration/removal, account deletion and session invalidation; provider grants revoked or explicit best-effort result. |
| Console notes/chat/consent/audits | Authenticated server functions and encrypted audits | Note isolation; consent policy accept/withdraw; model unavailable/provider error; encryption unavailable; audit expiry/delete/detail; actual model round trip. |
| Desk `/dashboard` | Catalog retrieval plus configured model call | Explicit local/model mode; retrieval provenance; no answer fabrication; provider timeout/error copy (current catch collapses faults to sign-in message). |
| `/console/workspace` | Browser document workspace and source panels | Local document persistence/clear, unsupported/empty imports, configured model; actual source connection/list/disconnect. |
| `/workspace` | Public local browser orientation | Distinguish browser storage from shipping SQLite/Python implementation; source-backed shipping claims and browser privacy behavior. |
| Admin | Allowlist + linked Google/Apple provider; audit/inquiry/telemetry functions | Verify linked identity proves the allowlisted address, not merely possession of any provider identity. Exercise denied email/password, X/passkey and nonallowlisted users; legitimate provider admin. |
| Contact / inquiry | `src/routes/contact.tsx` has no `validateSearch` or selected-service initialization. Static email drafts and server-accepted inquiries both use the `mlai-inquiries` browser collection; static copy calls drafts receipts, although opening an email client does not prove delivery. | Known service search initializes editable service context; unknown service safely falls back without invented selection. Static drafts are labelled drafts, distinct from server-accepted receipts. Sending failures preserve input; successful server acceptance returns a receipt and is visible to authorized admin. Verify signed-in linkage, signed-out inquiry, email-client cancellation, reload and storage failures. |
| Billing | One HTTPS payment link; Pilot catalog and custom Platform rejection | Real checkout link and business scope; no subscription reconciliation/webhooks/entitlements implementation evidenced here; do not imply these. |
| Quasar sites/new/settings/detail | Direct browser service origin, local registry/events/preview | Independent service gate; secure local access; real generation; preview lifecycle; uncertain mutation recovery; restart/crash state; durable registry and deletion. Root gate does not cover sidecar. |

## Six rooms and exported film gap

| Room | Current implementation | Required acceptance |
|---|---|---|
| `/showcase/film` | `Film` in body-portalled CinematicShell; room poster | Narration success/failure/offline, complete timeline, seek/pause/replay, end and exit; narrated export/captions. |
| `/showcase/trailer` | `Trailer` in CinematicShell; room poster | Same full playback contract; narrated export/captions. |
| `/showcase/abbey` | `AbbeyTrailer` in CinematicShell; room poster | Same, claims attribution and status labels; narrated export/captions. |
| `/showcase/explainer` | `Explainer` in CinematicShell; room poster | Same, transcript and understandable service/client narrative; narrated export/captions. |
| `/showcase/mega` | `Mega`, video-root wrapper, dark shell; room poster | Same, long-run performance/scene completion; narrated export/captions. |
| `/showcase/design` | `DesignHub`, eight lazy boards (Brand/System/Showcase/Hero/Lab/Marketing/Console/Docs) | Exercise every board and shell exit; this is an interactive board hub rather than an existing linear narrated film. Define and implement a narrated design film/export without losing board access. |

`e2e/rooms.spec.ts` currently exercises film reduced-motion advance, explainer transcript, and film Space handling. It does **not** certify all six rooms, successful Kokoro synthesis, complete timelines or exports. Existing trailer E2E covers the three short MP4 player cuts, not six cinematic room movies. Kokoro is an on-demand CDN/model dependency; network denial and Play without voice are essential acceptance paths.

## Public assets (complete committed public directory inventory at inspection)

| Assets | Current evidence | Required acceptance |
|---|---|---|
| `media/quesar-trailer.{mp4,webm,webp}`, `media/mark.vtt` | The mark cut; declared duration 10.04s, `hasAudio:false` | Decode/seek/poster and descriptions; cannot count as a narrated film. |
| `media/atmosphere-wafer.{mp4,webm,webp}`, `media/wafer.vtt` | Wafer cut; declared duration 6.04s, ambient audio | Decode/audio/descriptions; not narration. |
| `media/atmosphere-board.{mp4,webm,webp}`, `media/board.vtt` | Board cut; declared duration 6.04s, ambient audio | Decode/audio/descriptions; not narration. |
| `media/rooms/{film,trailer,abbey,explainer,mega,design}.webp` | Six real-room poster files exist | Match final rooms/export frames, dimensions, no missing posters. |
| `favicon.svg`, `apple-touch-icon.png`, `manifest.webmanifest`, `og.jpg`, `x-banner.jpg` | Brand/PWA/social assets exist | Correct identity, icon/manifest URLs and share previews. |
| `og/{docs,abi,platform,showcase,research,quesar,abbey,wdbx}.jpg` | Committed section cards | Regenerate through script when title/line changes; verify social metadata and routes. |
| `docs/wdbx/{acceleration,protocols,index,persistence,getting-started,limitations,cli,api,architecture}.md` | Nine public source docs | Links/downloads/source revision/status consistency. |
| `research/{wdbx-weighted-backtrace-memory-store,multi-persona-routing-policy-weights}{,-2026-09-06}.pdf` | Four public PDFs | Open/readable PDF, correct research links, status/date/source provenance. |
| `robots.txt` | Source robots exists; static build generates sitemap linkage | Verify built robots/sitemap excludes gated/static-notice surfaces and includes crawlable content. Server build has no generated sitemap per architecture. |

No six-room narrated movie assets are present in `public/media` at this inspection. Existing VTT tracks are descriptions of short footage, not speech captions. Export delivery is therefore **Blocked on implementation**, not closed by room code or posters.

## Highest-impact actual defects and release blockers

0. **High-impact public priority — service-to-contact continuity and delivery truth.** `src/routes/contact.tsx` lacks `validateSearch` and selected-service initialization, so the primary services/client inquiry journey does not carry selected service context into the form. Its static branch stores email drafts in the same `mlai-inquiries` collection as server-accepted receipts and describes them as receipts. An email-app handoff provides no delivery acknowledgement. Implement validated known/unknown service search, editable inquiry context, distinct static draft labels/storage semantics and server-accepted receipts; preserve input on failure and verify admin visibility of accepted inquiries.

1. **Confirmed source defect — Quasar service trust boundary.** `sidecars/quasar-service/src/server.ts` uses wildcard `Access-Control-Allow-Origin`, no authentication or origin gate, and `Bun.serve` without explicit loopback hostname. Site creation triggers scaffolding/install and paid model generation; edit, delete, registry disclosure and preview lifecycle are exposed. Preview start/stop accept GET. A reachable service permits unauthenticated read/destructive mutations and cross-origin browser access where browser private-network policy allows. Release must bind loopback, authenticate/authorize requests and restrict origins, reject GET mutations, and prove these controls through sidecar tests. Do not deploy this service as a public multiuser backend.
2. **Confirmed incomplete deliverable — narrated exports.** Only three short ambient/silent cuts exist; six rooms have no exported narrated films. Design is a board hub. Export scripts, deterministic capture, synthesized audio, captions and player/download integration are needed.
3. **Confirmed deployment blocker — ephemeral persistence and unstable signing fallback.** `src/lib/auth/server.ts` accepts a process-local random secret when `BETTER_AUTH_SECRET` is absent; DB falls back to in-memory PGLite without `DATABASE_URL`. These are development paths, unsuitable for staged/production acceptance. Fail closed or prove required configuration before release.
4. **Security review required — admin identity binding.** `decideAdmin` checks the user email allowlist and existence of a Google/Apple provider row; it does not compare that provider's verified email to the allowlisted email. `auth/server.ts` enables linking. A linking flow that attaches a different verified provider to an attacker-created allowlisted email could elevate access. Exploitability is **unknown** until Better Auth linking checks are traced/tested; no fabricated exploit claim. Release acceptance requires proof of address binding or stricter identity records.
5. **Confirmed incomplete auth journey — recovery/verification delivery.** No `sendVerification`, reset-password or forgot-password application wiring was found in `src`; email/password is enabled without a mail sender. Password recovery and email proof require implementation/configuration or explicit release scope. Provider admin rules are not email/password verification.
6. **Confirmed partial browser evidence.** Browser suite exists but room checks cover selected controls and silent playback only; it cannot prove narrated model startup/all-room completion/live providers/staging DB.
7. **Partial retention/deletion failure semantics.** `purgeUserData` executes sequential deletes and provider revocations without a transaction across the full purge/auth deletion. Mid-purge failure aborts account removal after earlier data was already erased. Verify recoverable retry behavior and user-visible failure; external revocation cannot be atomic with DB operations.
8. **Partial CSP.** `src/start.ts` preserves CSRF first and sets report-only CSP. Report-only is visibility rather than enforced script containment. Assess actual reports/origins before enforcement; do not advertise enforced CSP as current.

## Historical unfinished features and deliberate retirements

The merge matrix is historical routing evidence, not current acceptance. It lists all old pages as ported and records credential paths as unmeasured. Current source confirms their modules/routes exist; this inventory does not replay that September browser evidence.

| Historical surface | Current disposition | Completion dependency |
|---|---|---|
| xAI/Gemini, Google/Microsoft OAuth, Stripe, Turnstile, real Quasar generation, provider admin | Modules implemented; historic credential paths unmeasured | Real staging credentials and controlled end-to-end requests. |
| Account deletion, custom error pages | Implemented source; previously closed merge follow-ups | Re-run deletion failure/revocation/session and runtime error acceptance. |
| WDBX weighted retrieval | `/dashboard` explicitly uses lexical catalog; `/demo` browser engine | Keep distinction; real Rust store integration is separate scope, not inferred from marketing. |
| Old WorkOS/org/MFA, broker auth | Deliberately retired; Better Auth replaces | Do not resurrect. |
| Old `/app/*`, python-worker screen health probe, docs brief composer, unused store readers | Retired broken/unwired/unused legacy paths | No requirement to port absent a new approved user journey. |
| Native Android shell and Python worker | Standalone directories outside root gates | Own README install/build/test evidence if claimed shipping. |
| Server runtime publication | Vercel preset/output and checklist present; deployment not verified here | Stage first: Neon migrations, config, requests, provider flows, backup/recovery; domain cutover approval/evidence. |
| Static public publication | GitHub Pages docs build architecture | Root gate, build:static, check:static, test:e2e and claims audit; generated docs only via build. |

## Evidence required to close

Record exact commands/results in a follow-up acceptance ledger: root `bun run check`; `bun run build:static`; `bun run check:static`; `bun run test:e2e`; independent Quasar/Python/native gates when in scope; all public/detail routes and full client/partner contact journey; all-room timeline/voice/network/accessibility acceptance; movie technical probes and end-to-end playback; staged DB/auth/admin/cross-user/deletion/provider/cron requests. Never equate source inspection, historical merge status or local build artifacts with deployed service acceptance.
