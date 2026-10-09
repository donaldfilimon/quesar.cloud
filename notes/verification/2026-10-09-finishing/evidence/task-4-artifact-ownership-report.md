# Task 4 compiled artifact ownership correction — 2026-10-09

## Concrete problem and implementation

Root reported that a successful persistent build was subsequently replaced by an external concurrent static build in shared `.output`. A child-exit failure and a later missing-config readiness 200 were preserved by root. These are controller-reported artifact replacement evidence, not permission to relax persistent configuration or authentication policies.

Only `e2e/backend/persistent.acceptance.ts` changed. Under the existing explicit acceptance/loopback PostgreSQL guard, the optional `QUESAR_ACCEPTANCE_ARTIFACT_ROOT` selects an absolute local directory containing the **compiled** `server/index.mjs` and `public` resource directory. URLs, empty values and relative paths refuse. Omitting the variable retains the existing repository `.output` entry and working-directory contract. For an explicitly supplied artifact, the child starts the compiled entry inside the resolved artifact root with that root as its working directory; it consumes its compiled modules and public resources, without copying or executing source files.

Before owned database/scratch creation, the helper resolves the root and records a full-tree SHA256 over sorted relative directory/file/symlink records plus regular-file lengths and bytes. Internal symlinks are allowed (Nitro's tslib symlink is internal); dangling or escaping symlinks refuse. After stopping its owned child during aggregate teardown, the helper recomputes the hash and asserts unchanged. The controller-provided artifact is never deleted or modified by helper cleanup. This hash algorithm is a helper receipt, independent of a controller's own hash scheme.

Existing readiness-policy, child bind-receipt, secure session, migrations, encrypted isolation, restart/restore and resource cleanup assertions are unchanged. A static artifact still fails those qualification assertions. No production policy/interface, dependency, service/CSS/sibling source, remote service or secrets changed; no commits/subagents/builds.

## Verification

- `bun run typecheck`: exit 0.
- `bunx eslint e2e/backend/persistent.acceptance.ts --max-warnings 0`: exit 0.
- `bunx prettier --check e2e/backend/persistent.acceptance.ts`: exit 0.
- Guarded `QUESAR_ACCEPTANCE_ARTIFACT_ROOT=https://example.invalid/artifact bunx playwright test -c e2e/backend/persistent.config.ts --list`: exit 1 with the explicit absolute-local-directory refusal; 0 tests discovered, no URL fetched or fixture database created.
- Default guarded test discovery without artifact override is checked separately; actual runtime qualification of a controller-frozen artifact is root-owned and still pending when this implementation report is written.

Logs: `/Users/donaldfilimon/Documents/Codex/2026-10-09/new-chat-2/work/task4/`: `artifact-ownership-typecheck.log`, `artifact-ownership-lint.log`, `artifact-ownership-format.log`, `artifact-root-url-refusal.log`, `artifact-root-default-discovery.log`.

## Controller handoff and limits

Root owns the serial persistent build and coherent full-tree copy/hash comparison into projectless `work/artifact`, then runs the existing actual acceptance command with `QUESAR_ACCEPTANCE_ARTIFACT_ROOT=<absolute frozen compiled output root>` under its disposable parent. The path must contain `server/` and `public/`, not only a server entry file. Root should retain the artifact for review until qualification/reporting finishes.

Hash equality detects mutation; it is not an OS filesystem snapshot or access-control guarantee. Controller ownership and immutability remain prerequisites. The default shared `.output` continues to require serialization with other builders; the override avoids consuming their replacements. No deployment, live-provider, public TLS, online backup or power-loss acceptance is added. Source frozen after focused checks; root owns actual artifact integration and final gates.
