# Task 7 dependency gate qualification — 2026-10-09

Current: the two failing lazy-auth tests expose an installed dependency identity defect. They do not establish that Better Auth removed eager schema checking. No test, production source, dependency manifest, or lockfile was changed by this task.

Installed Better Auth is 1.7.7; root @better-auth/core is 1.7.6; Better Auth's nested @better-auth/core is 1.7.7; @better-auth/kysely-adapter is 1.7.7. Resolution from Better Auth reaches its nested core; resolution from the Kysely adapter reaches root core.

Primary installed-source evidence:

- node_modules/better-auth/dist/auth/base.mjs:15 still calls ctx.checkSchema?.() during initialization.
- node_modules/better-auth/dist/context/create-context.mjs:18,231 imports runtimeSchemaCheckFor from core and gets the check for ctx.adapter.
- node_modules/@better-auth/kysely-adapter/dist/index.mjs:5,714 imports core's registerSchemaCheck and registers the adapter's schema check.
- Both installed core copies' dist/db/schema-check.mjs hold their own module-local WeakMap. The adapter's registration is therefore invisible to Better Auth's core instance.

Verified module identity experiment registered a disposable adapter/check using the adapter-resolved core, then inspected both core instances: sameModule=false, registeredCheckVisibleToAdapter=true, registeredCheckVisibleToAuth=false. This demonstrates loss of runtime schema validation under the current installed graph, independently of scheduling or a sleep duration.

Commands and exits:

1. Node createRequire/import.meta.resolve experiment for better-auth, @better-auth/kysely-adapter, @better-auth/core: exit 0; resolved separate core paths as above.
2. `set -o pipefail; bunx vitest run src/lib/auth/lazy-auth.server.test.ts 2>&1 | tail -c 3500`: exit 1; 3 tests, 1 passed, 2 failed. Import/preflight protection passed; configured pg connection and local embedded-bootstrap assertions failed.
3. Node disposable registerSchemaCheck/runtimeSchemaCheckFor experiment: exit 0; booleans above.

Partial: no compatibility fix was made because the eager-init assertion is supported by installed Better Auth source. Changing this test to accept delayed database work would mask the installed dependency defect. Dependency alignment belongs to the external dependency owner. Lint/format/typecheck and root build were not run: no source changes, and the parent owns the full gate. No commits or remote actions.
