# Persistent Node server verification — 2026-10-09

Source and artifact preparation only; no production host or backend cutover.

- Final repository gate: `bun run check`, exit 0; 94 test files, 768 tests, formatting, typecheck, lint and default Vercel build.
- Focused build-mode/readiness checks: 2 files, 21 tests, exit 0 after final test cleanup.
- Inherited `VITE_STATIC_SITE=true bun run build:persistent`: expected exit 1 before build.
- Normal persistent build: exit 0, Nitro node-server entrypoint and all three PGLite runtime assets present.
- Built artifact, missing identity configuration and omitted NODE_ENV: loopback readiness and homepage returned 503. Shape-valid placeholder identity configuration returned readiness 200; this does not prove database connectivity. Both loopback processes stopped.
- Static compatibility: build and `check:static` exit 0, 129 HTML pages; homepage module preloads 16 before and after. Compatibility output was restored to the existing published docs because this task changes server behavior.
- Independent task review identified inherited static-mode and omitted-NODE_ENV bypasses. Both fixed and independently re-reviewed as addressed; no new important findings.

Production Postgres connectivity and migrations, native WDBX host configuration, restore qualification, HTTPS proxy, public browser commerce and actual funds settlement remain unverified. Host selection is still required.
